/**
 * Video Processing Pipeline Service
 * 
 * Orchestrates the flow:
 * 1. Video uploaded to Firebase Storage
 * 2. Add to processing queue
 * 3. Process with Google Cloud Video AI
 * 4. Store annotations in Firestore (source of truth)
 * 5. Explicit approval required to sync to training_videos (anonymized)
 */

import { sql } from '@/lib/db/postgres';
import { googleVideoAI, VideoAnnotations } from './google-video-ai.service';
import { adminDb } from '@/lib/firebaseAdmin';
import { filterRelevantLabels } from './label-filters';

// Room type classification based on labels
const ROOM_TYPE_MAPPINGS: Record<string, string[]> = {
  kitchen: ['kitchen', 'stove', 'oven', 'refrigerator', 'sink', 'countertop', 'dishwasher', 'microwave'],
  bathroom: ['bathroom', 'toilet', 'bathtub', 'shower', 'sink', 'mirror', 'tile'],
  bedroom: ['bedroom', 'bed', 'pillow', 'mattress', 'nightstand', 'dresser', 'closet'],
  living_room: ['living room', 'sofa', 'couch', 'television', 'tv', 'coffee table', 'fireplace'],
  dining_room: ['dining room', 'dining table', 'chair', 'chandelier'],
  garage: ['garage', 'car', 'tool', 'workbench'],
  outdoor: ['outdoor', 'garden', 'patio', 'lawn', 'pool', 'deck'],
  office: ['office', 'desk', 'computer', 'monitor', 'keyboard', 'chair'],
  laundry: ['laundry', 'washing machine', 'dryer', 'iron'],
};

// Action type classification
const ACTION_TYPE_MAPPINGS: Record<string, string[]> = {
  cleaning: ['cleaning', 'wiping', 'scrubbing', 'mopping', 'sweeping', 'vacuuming', 'dusting'],
  organizing: ['organizing', 'arranging', 'sorting', 'folding', 'stacking'],
  inspecting: ['inspecting', 'checking', 'examining', 'looking'],
  sanitizing: ['sanitizing', 'disinfecting', 'spraying'],
};

export interface ProcessingQueueItem {
  id: string;
  mediaId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  priority: number;
  attempts: number;
  lastError?: string;
}

class VideoProcessingPipeline {
  /**
   * Add a video to the processing queue
   */
  async queueVideo(mediaId: string, priority: number = 0): Promise<void> {
    try {
      const result = await sql`
        INSERT INTO video_processing_queue (media_id, priority)
        VALUES (${mediaId}, ${priority})
        ON CONFLICT (media_id) 
        DO UPDATE SET 
          status = 'queued',
          priority = GREATEST(video_processing_queue.priority, ${priority}),
          attempts = 0,
          last_error = NULL,
          queued_at = CURRENT_TIMESTAMP
      `;
      
      console.log(`[Pipeline] Queued video ${mediaId} with priority ${priority}`);
    } catch (error: any) {
      console.error(`[Pipeline] Failed to queue video ${mediaId}:`, error.message);
      throw error;
    }
  }

  /**
   * Process next video in queue
   * Reads from Firestore (source of truth)
   */
  async processNext(): Promise<{ processed: boolean; mediaId?: string; error?: string }> {
    // Get next queued item (use sql.query for raw query with FOR UPDATE SKIP LOCKED)
    const result = await sql.query(`
      UPDATE video_processing_queue
      SET 
        status = 'processing',
        started_at = CURRENT_TIMESTAMP,
        attempts = attempts + 1
      WHERE id = (
        SELECT id FROM video_processing_queue
        WHERE status = 'queued' AND attempts < max_attempts
        ORDER BY priority DESC, queued_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, media_id
    `);

    const rows = Array.isArray(result) ? result : result.rows;
    
    if (!rows || rows.length === 0) {
      return { processed: false };
    }

    const queueItem = rows[0];
    const mediaId = queueItem.media_id;

    try {
      // ✅ Get media record from FIRESTORE (not PostgreSQL)
      const mediaDoc = await adminDb.collection('media').doc(mediaId).get();

      if (!mediaDoc.exists) {
        throw new Error(`Media not found in Firestore: ${mediaId}`);
      }

      const media = mediaDoc.data()!;
      const storageUrl = media.url || media.storageUrl || media.downloadUrl || media.videoUrl;

      if (!storageUrl) {
        throw new Error(`No storage URL for media: ${mediaId}`);
      }

      // Process the video
      const processResult = await this.processVideo(mediaId, storageUrl);

      if (processResult.success) {
        // Mark queue item as completed
        await sql`
          UPDATE video_processing_queue
          SET status = 'completed', completed_at = CURRENT_TIMESTAMP
          WHERE media_id = ${mediaId}
        `;

        return { processed: true, mediaId };
      } else {
        throw new Error(processResult.error || 'Processing failed');
      }
    } catch (error: any) {
      // Mark as failed
      await sql`
        UPDATE video_processing_queue
        SET status = 'failed', last_error = ${error.message}
        WHERE media_id = ${mediaId}
      `;

      return { processed: false, mediaId, error: error.message };
    }
  }

  /**
   * Process a single video
   * Writes results to Firestore (source of truth)
   */
  async processVideo(
    mediaId: string,
    storageUrl: string
  ): Promise<{ success: boolean; error?: string }> {
    console.log(`[Pipeline] Processing video ${mediaId}`);

    const mediaRef = adminDb.collection('media').doc(mediaId);

    try {
      // ✅ Update status in FIRESTORE
      await mediaRef.update({
        aiStatus: 'processing',
        aiProcessingStarted: new Date(),
        aiError: null, // Clear any previous errors
      });

      // Get annotations from Google Cloud Video AI
      const result = await googleVideoAI.annotateVideo(storageUrl, ['LABEL', 'OBJECT', 'TEXT']);

      if (!result.success || !result.annotations) {
        throw new Error(result.error || 'No annotations returned');
      }

      // Extract raw labels
      const rawLabels = result.annotations.labels.map(l => l.description.toLowerCase());
      const rawObjects = result.annotations.objects.map(o => o.description.toLowerCase());

      // Filter to only relevant labels and deduplicate
      const filteredLabels = filterRelevantLabels(rawLabels);
      const filteredObjects = [...new Set(filterRelevantLabels(rawObjects))]; // Deduplicate here
      const combinedFiltered = [...new Set([...filteredLabels, ...filteredObjects])];

      console.log(`[Pipeline] Raw: ${rawObjects.length} objects, Filtered: ${filteredObjects.length}`);

      // Derive classifications using filtered labels
      const roomType = this.classifyRoomType(combinedFiltered);
      const actionTypes = this.classifyActionTypes(filteredLabels);
      const qualityScore = this.calculateQualityScore(result.annotations);
      const duration = this.estimateDuration(result.annotations);

      // ✅ Store results in FIRESTORE (source of truth)
      await mediaRef.update({
        aiStatus: 'completed',
        aiAnnotations: result.annotations,
        aiProcessedAt: new Date(),
        aiRoomType: roomType,
        aiActionTypes: actionTypes,
        aiObjectLabels: [...new Set(filteredObjects)].slice(0, 30), // Deduplicate and store filtered objects only
        aiQualityScore: qualityScore,
        aiDuration: duration,
        // Debug fields
        aiRawLabelCount: rawObjects.length,
        aiFilteredLabelCount: filteredObjects.length,
        // Training workflow status
        trainingStatus: 'pending',  // pending | approved | rejected
      });

      // ❌ REMOVED: Auto-sync to training_videos
      // This only happens on explicit approval now

      console.log(`[Pipeline] Successfully processed video ${mediaId}`);
      return { success: true };
    } catch (error: any) {
      console.error(`[Pipeline] Processing failed for ${mediaId}:`, error.message);

      await mediaRef.update({
        aiStatus: 'failed',
        aiError: error.message,
        aiFailedAt: new Date(),
      }).catch(() => {});

      return { success: false, error: error.message };
    }
  }

  /**
   * Sync approved video to PostgreSQL training_videos (ANONYMIZED)
   * Called only when admin explicitly approves for training
   */
  async syncToTrainingCorpus(mediaId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get the processed media from Firestore
      const mediaDoc = await adminDb.collection('media').doc(mediaId).get();
      
      if (!mediaDoc.exists) {
        throw new Error('Media not found');
      }
      
      const media = mediaDoc.data()!;
      
      if (media.aiStatus !== 'completed') {
        throw new Error('Video must be processed before approval');
      }
      
      const videoUrl = media.url || media.storageUrl || media.downloadUrl || media.videoUrl;
      
      if (!videoUrl) {
        throw new Error('Video URL not found');
      }
      
      // ✅ Insert into PostgreSQL training_videos (ANONYMIZED - no locationId)
      await sql`
        INSERT INTO training_videos (
          source_media_id,
          video_url,
          room_type,
          action_types,
          object_labels,
          technique_tags,
          duration_seconds,
          quality_score,
          is_featured
        ) VALUES (
          ${mediaId},
          ${videoUrl},
          ${media.aiRoomType || null},
          ${media.aiActionTypes || []},
          ${media.aiObjectLabels || []},
          ${[]},
          ${media.aiDuration || null},
          ${media.aiQualityScore || 0},
          ${false}
        )
        ON CONFLICT (source_media_id) DO UPDATE SET
          room_type = EXCLUDED.room_type,
          action_types = EXCLUDED.action_types,
          object_labels = EXCLUDED.object_labels,
          quality_score = EXCLUDED.quality_score,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      // ✅ Update Firestore to reflect approval
      await adminDb.collection('media').doc(mediaId).update({
        trainingStatus: 'approved',
        trainingApprovedAt: new Date(),
      });
      
      console.log(`[Pipeline] Video ${mediaId} approved and synced to training corpus`);
      return { success: true };
    } catch (error: any) {
      console.error(`[Pipeline] Failed to sync ${mediaId} to training:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reject a video from training corpus
   */
  async rejectFromTraining(mediaId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await adminDb.collection('media').doc(mediaId).update({
        trainingStatus: 'rejected',
        trainingRejectedAt: new Date(),
      });
      
      // Remove from PostgreSQL if it was previously approved
      await sql`
        DELETE FROM training_videos WHERE source_media_id = ${mediaId}
      `.catch(() => {}); // Ignore errors if not in table
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Classify room type from labels
   */
  private classifyRoomType(labels: string[]): string | null {
    const scores: Record<string, number> = {};

    for (const [roomType, keywords] of Object.entries(ROOM_TYPE_MAPPINGS)) {
      scores[roomType] = 0;
      for (const keyword of keywords) {
        if (labels.some(l => l.includes(keyword))) {
          scores[roomType]++;
        }
      }
    }

    const topRoom = Object.entries(scores)
      .filter(([_, score]) => score > 0)
      .sort((a, b) => b[1] - a[1])[0];

    return topRoom ? topRoom[0] : null;
  }

  /**
   * Classify action types from labels
   */
  private classifyActionTypes(labels: string[]): string[] {
    const actions: string[] = [];

    for (const [actionType, keywords] of Object.entries(ACTION_TYPE_MAPPINGS)) {
      if (keywords.some(keyword => labels.some(l => l.includes(keyword)))) {
        actions.push(actionType);
      }
    }

    return actions;
  }

  /**
   * Calculate quality score based on annotation richness
   */
  private calculateQualityScore(annotations: VideoAnnotations): number {
    let score = 0;
    const maxScore = 100;

    // Labels contribute up to 30 points
    const labelScore = Math.min(annotations.labels.length * 3, 30);
    score += labelScore;

    // High-confidence labels (>0.8) get bonus
    const highConfLabels = annotations.labels.filter(l => l.confidence > 0.8).length;
    score += Math.min(highConfLabels * 2, 10);

    // Objects contribute up to 30 points
    const objectScore = Math.min(annotations.objects.length * 3, 30);
    score += objectScore;

    // Text detection (product labels, signs) contribute up to 10 points
    const textScore = Math.min(annotations.text.length * 2, 10);
    score += textScore;

    // Shot variety (more shots = more comprehensive) up to 10 points
    const shotScore = Math.min(annotations.shots.length, 10);
    score += shotScore;

    return score / maxScore;
  }

  /**
   * Estimate video duration from annotations
   */
  private estimateDuration(annotations: VideoAnnotations): number | null {
    let maxTime = 0;

    // Check shot end times
    for (const shot of annotations.shots) {
      if (shot.endTime > maxTime) maxTime = shot.endTime;
    }

    // Check label segment end times
    for (const label of annotations.labels) {
      for (const seg of label.segments) {
        if (seg.endTime > maxTime) maxTime = seg.endTime;
      }
    }

    return maxTime > 0 ? Math.ceil(maxTime) : null;
  }

  /**
   * Get queue statistics
   * Now includes training approval stats from Firestore
   */
  async getQueueStats(): Promise<{
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    // Training corpus stats
    pendingApproval: number;
    approved: number;
    rejected: number;
  }> {
    // Queue stats from PostgreSQL
    const queueResult = await sql`
      SELECT status, COUNT(*)::int as count
      FROM video_processing_queue
      GROUP BY status
    `;
    
    const queueRows = Array.isArray(queueResult) ? queueResult : queueResult.rows;
    const stats: any = { queued: 0, processing: 0, completed: 0, failed: 0 };
    
    for (const row of queueRows || []) {
      if (row.status in stats) {
        stats[row.status] = Number(row.count) || 0;
      }
    }
    
    // Training approval stats from Firestore
    const mediaSnap = await adminDb.collection('media')
      .where('aiStatus', '==', 'completed')
      .get();
    
    let pendingApproval = 0;
    let approved = 0;
    let rejected = 0;
    
    mediaSnap.docs.forEach(doc => {
      const data = doc.data();
      switch (data.trainingStatus) {
        case 'approved': approved++; break;
        case 'rejected': rejected++; break;
        default: pendingApproval++;
      }
    });
    
    return {
      ...stats,
      pendingApproval,
      approved,
      rejected,
    };
  }

  /**
   * Retry failed videos
   */
  async retryFailed(): Promise<number> {
    const result = await sql`
      UPDATE video_processing_queue
      SET 
        status = 'queued',
        attempts = 0,
        last_error = NULL,
        queued_at = CURRENT_TIMESTAMP
      WHERE status = 'failed'
      RETURNING id
    `;

    const rows = Array.isArray(result) ? result : result.rows;
    return rows ? rows.length : 0;
  }

  /**
   * Process batch of videos (for cron job)
   */
  async processBatch(batchSize: number = 5): Promise<{
    processed: number;
    failed: number;
    errors: string[];
  }> {
    const results = { processed: 0, failed: 0, errors: [] as string[] };

    for (let i = 0; i < batchSize; i++) {
      const result = await this.processNext();
      
      if (!result.processed && !result.mediaId) {
        // Queue is empty
        break;
      }

      if (result.processed) {
        results.processed++;
      } else {
        results.failed++;
        if (result.error) {
          results.errors.push(`${result.mediaId}: ${result.error}`);
        }
      }
    }

    return results;
  }
}

// Export singleton
export const videoProcessingPipeline = new VideoProcessingPipeline();

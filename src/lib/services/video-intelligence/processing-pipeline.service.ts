/**
 * Video Processing Pipeline Service
 * 
 * Orchestrates the flow:
 * 1. Video uploaded to Firebase Storage
 * 2. Add to processing queue
 * 3. Process with Google Cloud Video AI
 * 4. Store annotations in PostgreSQL (media table)
 * 5. Derive training entry (anonymized)
 */

import { sql } from '@/lib/db/postgres';
import { googleVideoAI, VideoAnnotations } from './google-video-ai.service';
import { adminStorage, adminDb } from '@/lib/firebaseAdmin';

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

export interface DerivedTrainingEntry {
  sourceMediaId: string;
  videoUrl: string;
  roomType: string | null;
  actionTypes: string[];
  objectLabels: string[];
  techniqueTags: string[];
  durationSeconds: number | null;
  qualityScore: number;
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
      // Get media record
      const mediaResult = await sql`
        SELECT * FROM media WHERE id = ${mediaId}
      `;

      const mediaRows = Array.isArray(mediaResult) ? mediaResult : mediaResult.rows;

      if (!mediaRows || mediaRows.length === 0) {
        throw new Error(`Media record not found: ${mediaId}`);
      }

      const media = mediaRows[0];

      // Process the video
      const processResult = await this.processVideo(mediaId, media.storage_url);

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
   */
  async processVideo(
    mediaId: string,
    storageUrl: string
  ): Promise<{ success: boolean; error?: string }> {
    console.log(`[Pipeline] Processing video ${mediaId}`);

    try {
      // Update media status
      await sql`
        UPDATE media 
        SET ai_status = 'processing' 
        WHERE id = ${mediaId}
      `;

      // Get annotations from Google Cloud Video AI
      const result = await googleVideoAI.annotateVideo(storageUrl, ['LABEL', 'OBJECT', 'TEXT']);

      if (!result.success || !result.annotations) {
        throw new Error(result.error || 'No annotations returned');
      }

      // Store annotations in media table
      await sql`
        UPDATE media
        SET 
          ai_status = 'completed',
          ai_annotations = ${JSON.stringify(result.annotations)}::jsonb,
          ai_processed_at = CURRENT_TIMESTAMP
        WHERE id = ${mediaId}
      `;

      // Derive and store training entry
      await this.deriveTrainingEntry(mediaId, storageUrl, result.annotations);

      console.log(`[Pipeline] Successfully processed video ${mediaId}`);
      return { success: true };
    } catch (error: any) {
      console.error(`[Pipeline] Processing failed for ${mediaId}:`, error.message);

      await sql`
        UPDATE media
        SET 
          ai_status = 'failed',
          ai_error = ${error.message}
        WHERE id = ${mediaId}
      `;

      return { success: false, error: error.message };
    }
  }

  /**
   * Derive anonymized training entry from processed video
   */
  private async deriveTrainingEntry(
    mediaId: string,
    videoUrl: string,
    annotations: VideoAnnotations
  ): Promise<void> {
    // Extract all labels
    const allLabels = annotations.labels.map(l => l.description.toLowerCase());
    const allObjects = annotations.objects.map(o => o.description.toLowerCase());

    // Classify room type
    const roomType = this.classifyRoomType([...allLabels, ...allObjects]);

    // Classify action types
    const actionTypes = this.classifyActionTypes(allLabels);

    // Get unique object labels (cleaned up)
    const objectLabels = [...new Set(allObjects)].slice(0, 20); // Limit to 20

    // Calculate quality score based on annotation richness
    const qualityScore = this.calculateQualityScore(annotations);

    // Get video duration from annotations (approximate from shots or segments)
    const durationSeconds = this.estimateDuration(annotations);

    // Insert training entry (NO location_id, NO session_id = anonymized)
    await sql`
      INSERT INTO training_videos (
        source_media_id,
        video_url,
        room_type,
        action_types,
        object_labels,
        technique_tags,
        duration_seconds,
        quality_score
      ) VALUES (
        ${mediaId},
        ${videoUrl},
        ${roomType},
        ${actionTypes},
        ${objectLabels},
        ${[]},
        ${durationSeconds},
        ${qualityScore}
      )
      ON CONFLICT (source_media_id) DO UPDATE SET
        room_type = ${roomType},
        action_types = ${actionTypes},
        object_labels = ${objectLabels},
        quality_score = ${qualityScore},
        updated_at = CURRENT_TIMESTAMP
    `;

    console.log(`[Pipeline] Created training entry for ${mediaId}: room=${roomType}, quality=${qualityScore.toFixed(2)}`);
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
   */
  async getQueueStats(): Promise<{
    queued: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const result = await sql`
      SELECT 
        status,
        COUNT(*)::int as count
      FROM video_processing_queue
      GROUP BY status
    `;

    const rows = Array.isArray(result) ? result : result.rows;
    const stats = { queued: 0, processing: 0, completed: 0, failed: 0 };
    
    for (const row of rows) {
      const status = row.status as keyof typeof stats;
      if (status in stats) {
        stats[status] = Number(row.count) || 0;
      }
    }

    return stats;
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


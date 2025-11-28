/**
 * FIREBASE → POSTGRESQL SYNC SERVICE
 * One-way sync from Firebase (source of truth) to PostgreSQL (analytics DB)
 */

import { adminDb } from '@/lib/firebaseAdmin';
import { Client } from 'pg';

interface VideoDocument {
  id: string;
  userId: string;
  locationId: string;
  organizationId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  fileSize?: number;
  uploadedAt: Date;
  status: string;
  
  // Optional task data
  taskId?: string;
  completionTime?: number;
  accuracy?: number;
  errors?: number;
  annotations?: any;
}

export class FirebaseToSQLSyncService {
  private client: Client | null = null;

  async connect(): Promise<void> {
    try {
      this.client = new Client({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DATABASE,
        port: 5432,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      });

      await this.client.connect();
      console.log('[Firebase→SQL] PostgreSQL connection established');
    } catch (error: any) {
      console.error('[Firebase→SQL] Connection failed:', error);
      throw new Error(`PostgreSQL connection failed: ${error.message}`);
    }
  }

  /**
   * Sync videos from Firebase to PostgreSQL
   */
  async syncRobotIntelligence(): Promise<{
    synced: number;
    errors: number;
    lastSyncTimestamp: Date;
  }> {
    if (!this.client) {
      await this.connect();
    }

    const stats = {
      synced: 0,
      errors: 0,
      lastSyncTimestamp: new Date(),
    };

    try {
      // Get last sync timestamp
      const syncMetadataDoc = await adminDb
        .collection('_sync_metadata')
        .doc('sql_sync')
        .get();
      
      const lastSync = syncMetadataDoc.exists
        ? syncMetadataDoc.data()?.lastSyncAt?.toDate()
        : new Date(0);

      console.log(`[Firebase→SQL] Syncing records after ${lastSync.toISOString()}`);

      // Fetch new/updated videos from Firebase
      const videosSnapshot = await adminDb
        .collection('videos')
        .where('uploadedAt', '>', lastSync)
        .orderBy('uploadedAt', 'asc')
        .limit(1000)
        .get();

      console.log(`[Firebase→SQL] Found ${videosSnapshot.size} new records`);

      for (const doc of videosSnapshot.docs) {
        try {
          const data = doc.data();
          const video: VideoDocument = {
            id: doc.id,
            userId: data.userId,
            locationId: data.locationId,
            organizationId: data.organizationId,
            videoUrl: data.videoUrl,
            thumbnailUrl: data.thumbnailUrl,
            duration: data.duration,
            fileSize: data.fileSize,
            uploadedAt: data.uploadedAt?.toDate() || new Date(),
            status: data.status,
            taskId: data.taskId,
            completionTime: data.completionTime,
            accuracy: data.accuracy,
            errors: data.errors,
            annotations: data.annotations,
          };

          // Upsert to PostgreSQL
          await this.upsertRecord(video);
          stats.synced++;
        } catch (error: any) {
          console.error(`[Firebase→SQL] Error syncing ${doc.id}:`, error);
          stats.errors++;
        }
      }

      // Update sync metadata
      await adminDb.collection('_sync_metadata').doc('sql_sync').set({
        lastSyncAt: stats.lastSyncTimestamp,
        recordsSynced: stats.synced,
        errors: stats.errors,
        direction: 'firebase_to_sql',
      }, { merge: true });

      console.log(`[Firebase→SQL] Sync complete: ${stats.synced} synced, ${stats.errors} errors`);
      return stats;
    } catch (error: any) {
      console.error('[Firebase→SQL] Fatal error:', error);
      throw error;
    }
  }

  /**
   * Upsert record to PostgreSQL
   */
  private async upsertRecord(video: VideoDocument): Promise<void> {
    const query = `
      INSERT INTO robot_intelligence (
        firebase_id, task_id, location_id, user_id, organization_id,
        completion_time, accuracy, errors, video_url, thumbnail_url,
        annotations, file_size, duration, created_at, updated_at, synced_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      ON CONFLICT (firebase_id) 
      DO UPDATE SET
        task_id = EXCLUDED.task_id,
        completion_time = EXCLUDED.completion_time,
        accuracy = EXCLUDED.accuracy,
        errors = EXCLUDED.errors,
        video_url = EXCLUDED.video_url,
        thumbnail_url = EXCLUDED.thumbnail_url,
        annotations = EXCLUDED.annotations,
        file_size = EXCLUDED.file_size,
        duration = EXCLUDED.duration,
        updated_at = EXCLUDED.updated_at,
        synced_at = NOW()
    `;

    const values = [
      video.id,
      video.taskId || null,
      video.locationId,
      video.userId,
      video.organizationId,
      video.completionTime || null,
      video.accuracy || null,
      video.errors || 0,
      video.videoUrl,
      video.thumbnailUrl || null,
      video.annotations ? JSON.stringify(video.annotations) : null,
      video.fileSize || null,
      video.duration || null,
      video.uploadedAt,
      video.uploadedAt,
    ];

    await this.client!.query(query, values);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
      console.log('[Firebase→SQL] PostgreSQL connection closed');
    }
  }
}

export const firebaseToSQLSync = new FirebaseToSQLSyncService();


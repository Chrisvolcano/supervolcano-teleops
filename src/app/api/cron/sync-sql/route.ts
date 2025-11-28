/**
 * CRON ENDPOINT: Firebase → PostgreSQL Sync
 * Syncs videos/training data from Firebase to PostgreSQL every 5 minutes
 */

import { NextRequest, NextResponse } from 'next/server';
import { firebaseToSQLSync } from '@/services/firebase-to-sql-sync.service';

export const maxDuration = 300; // 5 minutes max execution time

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const expectedAuth = cronSecret ? `Bearer ${cronSecret}` : null;
    
    if (expectedAuth && authHeader !== expectedAuth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Cron] Starting Firebase → PostgreSQL sync...');
    const startTime = Date.now();

    const stats = await firebaseToSQLSync.syncRobotIntelligence();
    
    const duration = Date.now() - startTime;
    console.log(`[Cron] Sync completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      stats,
      duration,
      direction: 'firebase_to_postgresql',
    });
  } catch (error: any) {
    console.error('[Cron] Sync failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  } finally {
    await firebaseToSQLSync.disconnect();
  }
}


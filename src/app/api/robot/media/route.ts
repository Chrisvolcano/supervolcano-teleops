import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

/**
 * Get Media (Videos/Images)
 * GET /api/robot/media
 * Queries Firestore media collection (source of truth)
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const apiKey = request.headers.get('X-Robot-API-Key');
    if (!apiKey || apiKey !== process.env.ROBOT_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    // Query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 1000);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const locationId = searchParams.get('location_id');
    const jobId = searchParams.get('job_id');
    const fileType = searchParams.get('file_type');

    // Build Firestore query
    let query: FirebaseFirestore.Query = adminDb.collection('media');

    if (locationId) {
      query = query.where('locationId', '==', locationId);
    }

    if (jobId) {
      query = query.where('taskId', '==', jobId);
    }

    // Order by uploadedAt (descending)
    try {
      query = query.orderBy('uploadedAt', 'desc');
    } catch (error) {
      // If orderBy fails (no index), fetch without orderBy and sort in memory
      console.warn('[Robot Media API] OrderBy failed, fetching without orderBy');
    }

    // Fetch media
    const snapshot = await query.get();

    // Filter and map results
    let allMedia = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        job_id: data.taskId || data.jobId || null,
        location_id: data.locationId || null,
        storage_url: data.storageUrl || data.url || data.videoUrl || null,
        thumbnail_url: data.thumbnailUrl || data.thumbnail || null,
        file_type: data.fileType || data.mimeType || data.mediaType || null,
        duration_seconds: data.durationSeconds || data.duration || null,
        uploaded_at: data.uploadedAt?.toDate?.()?.toISOString() || data.createdAt?.toDate?.()?.toISOString() || null,
        uploaded_by: data.uploadedBy || data.uploaded_by || null,
      };
    });

    // Filter by file type if provided
    if (fileType) {
      allMedia = allMedia.filter((m) => {
        const mimeType = m.file_type?.toLowerCase() || '';
        if (fileType.toLowerCase() === 'video') {
          return mimeType.startsWith('video/') || m.file_type === 'video';
        }
        if (fileType.toLowerCase() === 'image') {
          return mimeType.startsWith('image/') || m.file_type === 'image';
        }
        return mimeType.includes(fileType.toLowerCase());
      });
    }

    // Sort by uploadedAt (newest first)
    allMedia.sort((a, b) => {
      const dateA = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0;
      const dateB = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0;
      return dateB - dateA;
    });

    // Apply pagination
    const total = allMedia.length;
    const paginatedMedia = allMedia.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      media: paginatedMedia,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Robot media API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

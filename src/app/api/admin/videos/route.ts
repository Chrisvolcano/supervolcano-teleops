/**
 * GET /api/admin/videos
 * 
 * List all videos with AI annotations and filtering
 * Uses Firestore instead of SQL
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

// Helper function to determine if a document is a video
function isVideo(document: FirebaseFirestore.DocumentData): boolean {
  const type = document.type || document.mediaType || '';
  const mimeType = document.mimeType || document.contentType || '';
  const fileName = document.fileName || '';

  if (type === 'video' || type === 'VIDEO') return true;
  if (mimeType?.startsWith?.('video/')) return true;
  
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
  const lowerFileName = fileName.toLowerCase();
  return videoExtensions.some(ext => lowerFileName.endsWith(ext));
}

// Helper function to determine AI status
function getAIStatus(document: FirebaseFirestore.DocumentData): 'pending' | 'processing' | 'completed' | 'failed' {
  // Check for completed status (has annotations)
  if (document.aiAnnotations || document.annotations) {
    return 'completed';
  }
  
  // Check for failed status (has error)
  if (document.aiError || document.annotationError) {
    return 'failed';
  }
  
  // Check for processing status (has processing flag)
  if (document.aiProcessingStarted || document.processing === true || document.aiStatus === 'processing') {
    return 'processing';
  }
  
  // Default to pending
  return 'pending';
}

// Helper function to format date
function formatDate(date: any): string | null {
  if (!date) return null;
  if (date.toDate) return date.toDate().toISOString();
  if (date instanceof Date) return date.toISOString();
  if (typeof date === 'string') return date;
  return null;
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);
    
    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);

    // Parse query params
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || searchParams.get('aiStatus') || '';
    const locationId = searchParams.get('locationId') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build Firestore query
    let query: FirebaseFirestore.Query = adminDb.collection('media');

    // Filter by location if provided
    if (locationId) {
      query = query.where('locationId', '==', locationId);
    }

    // Order by uploadedAt (descending) - use single orderBy
    query = query.orderBy('uploadedAt', 'desc');

    // Fetch all media (we'll filter videos and status in memory)
    let snapshot;
    try {
      snapshot = await query.get();
    } catch (error: any) {
      // If orderBy fails, try without orderBy and sort in memory
      console.warn('[API] OrderBy failed, fetching without orderBy:', error.message);
      query = adminDb.collection('media');
      if (locationId) {
        query = query.where('locationId', '==', locationId);
      }
      snapshot = await query.get();
    }

    // First pass: Calculate stats from ALL videos (before any filtering)
    const stats = { queued: 0, processing: 0, completed: 0, failed: 0 };
    const allVideoDocs: Array<{ doc: FirebaseFirestore.QueryDocumentSnapshot; aiStatus: string }> = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      
      // Skip if not a video
      if (!isVideo(data)) return;

      const aiStatus = getAIStatus(data);
      
      // Update stats from ALL videos (before status filtering)
      stats[aiStatus === 'pending' ? 'queued' : aiStatus as keyof typeof stats]++;
      
      allVideoDocs.push({ doc, aiStatus });
    });

    // Second pass: Filter by status and build video objects
    const allVideos: any[] = allVideoDocs
      .filter(({ aiStatus }) => {
        // Apply status filter if provided
        if (statusFilter && statusFilter !== 'all') {
          return aiStatus === statusFilter;
        }
        return true;
      })
      .map(({ doc, aiStatus }) => {
        const data = doc.data();
        return {
          id: doc.id,
          fileName: data.fileName || data.name || 'unknown',
          url: data.storageUrl || data.url || data.videoUrl || '',
          thumbnailUrl: data.thumbnailUrl || data.thumbnail || null,
          locationId: data.locationId || null,
          roomId: data.roomId || null,
          targetId: data.targetId || null,
          actionId: data.actionId || null,
          uploadedAt: formatDate(data.uploadedAt || data.createdAt),
          aiStatus,
          aiAnnotations: data.aiAnnotations || data.annotations || null,
          aiError: data.aiError || data.annotationError || null,
          duration: data.durationSeconds || data.duration || null,
          size: data.fileSize || data.size || null,
        };
      });

    // Sort by uploadedAt (newest first)
    allVideos.sort((a, b) => {
      const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      return dateB - dateA;
    });

    // Apply pagination
    const paginatedVideos = allVideos.slice(offset, offset + limit);

    // Fetch location names for all unique location IDs
    const locationIds = [...new Set(paginatedVideos.map(v => v.locationId).filter(Boolean))];
    const locationMap = new Map<string, string>();

    // Fetch each location document individually (more reliable than 'in' query)
    await Promise.all(
      locationIds.map(async (locationId) => {
        try {
          const locationDoc = await adminDb.collection('locations').doc(locationId).get();
          if (locationDoc.exists) {
            const data = locationDoc.data();
            locationMap.set(locationId, data?.name || data?.address || locationId);
          }
        } catch (error) {
          console.error(`Failed to fetch location ${locationId}:`, error);
        }
      })
    );

    // Add location names to videos
    const videosWithLocations = paginatedVideos.map(video => ({
      ...video,
      locationName: video.locationId ? locationMap.get(video.locationId) || null : null,
    }));

    return NextResponse.json({
      videos: videosWithLocations,
      stats,
      pagination: {
        total: allVideos.length,
        limit,
        offset,
        hasMore: offset + limit < allVideos.length,
      },
    });
  } catch (error: any) {
    console.error('[API] Videos list error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}

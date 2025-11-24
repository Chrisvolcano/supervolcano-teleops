import { NextRequest, NextResponse } from 'next/server';
import { getTasks } from '@/lib/repositories/sql/tasks';
import { getUserClaims, requireRole } from '@/lib/utils/auth';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Admin auth check
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Only allow superadmin, admin, and partner_admin
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);
    
    const searchParams = request.nextUrl.searchParams;
    const locationId = searchParams.get('locationId') || undefined;
    const jobId = searchParams.get('jobId') || undefined; // Changed from taskId
    const taskType = searchParams.get('taskType') || undefined; // Changed from momentType
    const humanVerified = searchParams.get('humanVerified') === 'true' ? true : 
                         searchParams.get('humanVerified') === 'false' ? false : undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const result = await getTasks({
      locationId,
      jobId,
      taskType,
      humanVerified,
      limit,
      offset
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Get tasks error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get tasks' },
      { status: 500 }
    );
  }
}

/**
 * Create a new task in Firestore (not SQL)
 * Firestore is the source of truth, SQL is synced copy
 */
export async function POST(request: NextRequest) {
  try {
    // Admin auth check
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Only allow superadmin, admin, and partner_admin
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);
    
    // Get user ID from token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;
    
    const data = await request.json();
    
    console.log('🔍 API: Received task creation request:', {
      title: data.title,
      locationId: data.locationId,
      locationName: data.locationName,
      category: data.category,
    });
    
    // Validate required fields
    if (!data.title) {
      console.error('❌ API: Missing title');
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }
    
    if (!data.locationId) {
      console.error('❌ API: Missing locationId');
      return NextResponse.json(
        { success: false, error: 'Location ID is required' },
        { status: 400 }
      );
    }
    
    // Create task document in Firestore
    const taskData = {
      title: data.title,
      description: data.description || '',
      category: data.category || 'general',
      locationId: data.locationId, // ← Use locationId consistently
      locationName: data.locationName || '',
      estimatedDuration: data.estimatedDurationMinutes || null,
      priority: data.priority || 'medium',
      status: 'available',
      state: 'available',
      assigned_to: 'unassigned',
      createdAt: new Date(),
      createdBy: userId || 'admin',
      updatedAt: new Date(),
      partnerOrgId: data.partnerOrgId || 'demo-org',
    };
    
    console.log('🔍 API: Task data to save:', taskData);
    
    // Add to Firestore
    const docRef = await adminDb.collection('tasks').add(taskData);
    
    console.log('✅ API: Task saved to Firestore with ID:', docRef.id);
    
    // Verify it was saved (exists is a property, not a method)
    const savedDoc = await docRef.get();
    console.log('🔍 API: Verification - Document exists:', savedDoc.exists);
    if (savedDoc.exists) {
      console.log('🔍 API: Verification - Saved data:', savedDoc.data());
    } else {
      console.error('❌ API: Verification failed - Document does not exist!');
    }
    
    // OPTIONAL: Auto-sync to SQL (don't fail if this fails)
    try {
      console.log('Auto-syncing task to SQL...');
      const { syncJobFromRoot } = await import('@/lib/services/sync/firestoreToSql');
      await syncJobFromRoot(docRef.id, data.locationId);
      console.log('Task synced to SQL successfully');
    } catch (syncError: any) {
      console.error('Failed to sync to SQL (task still saved in Firestore):', syncError);
      // Don't fail the request - task is saved in Firestore
    }
    
    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: 'Task created successfully in Firestore',
      task: {
        id: docRef.id,
        ...taskData
      }
    });
  } catch (error: any) {
    console.error('Failed to create task:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create task' },
      { status: 500 }
    );
  }
}

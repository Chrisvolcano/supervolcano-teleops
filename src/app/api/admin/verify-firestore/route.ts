import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
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
    
    requireRole(claims, ['superadmin', 'admin']);
    
    // Test Firestore connection
    console.log('🔍 Testing Firestore connection...');
    const tasksRef = adminDb.collection('tasks');
    const snapshot = await tasksRef.limit(1).get();
    
    console.log('✅ Firestore connection working');
    
    return NextResponse.json({
      success: true,
      connected: true,
      hasAccess: true,
      sampleTaskCount: snapshot.size,
      message: 'Firestore connection working',
    });
    
  } catch (error: any) {
    console.error('❌ Firestore connection failed:', error);
    return NextResponse.json({
      success: false,
      connected: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}




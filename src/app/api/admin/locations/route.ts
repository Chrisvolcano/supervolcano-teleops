import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';
import { adminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';
import { syncLocation } from '@/lib/services/sync/firestoreToSql';

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
    
    // Get locations from SQL
    const sqlResult = await sql`
      SELECT 
        l.*,
        COUNT(DISTINCT t.id) as task_count,
        COUNT(DISTINCT m.id) as moment_count
      FROM locations l
      LEFT JOIN tasks t ON l.id = t.location_id
      LEFT JOIN moments m ON l.id = m.location_id
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `;
    
    const sqlLocationIds = new Set(sqlResult.rows.map((l: any) => l.id));
    
    // Get all locations from Firestore
    const firestoreSnapshot = await adminDb.collection('locations').get();
    const firestoreLocations = firestoreSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Find locations in Firestore that aren't in SQL yet
    const missingLocations = firestoreLocations.filter(loc => !sqlLocationIds.has(loc.id));
    
    // Sync missing locations to SQL
    for (const location of missingLocations) {
      try {
        await syncLocation(location.id);
      } catch (error) {
        console.error(`Failed to sync location ${location.id}:`, error);
      }
    }
    
    // Re-query SQL to get updated list (including newly synced locations)
    const finalResult = await sql`
      SELECT 
        l.*,
        COUNT(DISTINCT t.id) as task_count,
        COUNT(DISTINCT m.id) as moment_count
      FROM locations l
      LEFT JOIN tasks t ON l.id = t.location_id
      LEFT JOIN moments m ON l.id = m.location_id
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `;
    
    return NextResponse.json({
      success: true,
      locations: finalResult.rows
    });
  } catch (error: any) {
    console.error('Failed to get locations:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get locations' },
      { status: 500 }
    );
  }
}


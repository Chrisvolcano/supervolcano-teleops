/**
 * LOCATION STRUCTURE API
 * Save/update location floor/room/target/action hierarchy
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { sql } from '@/lib/db/postgres';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth check
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    requireRole(claims, ['superadmin', 'admin', 'partner_admin', 'location_owner']);

    const locationId = params.id;
    const body = await request.json();
    const { floors } = body;

    console.log(`[Structure] Saving structure for location ${locationId}`);
    console.log(`[Structure] Floors: ${floors.length}`);

    // Save to Firestore (source of truth)
    const batch = adminDb.batch();

    // Delete existing structure for this location
    const existingFloorsSnap = await adminDb
      .collection('locations')
      .doc(locationId)
      .collection('floors')
      .get();
    
    existingFloorsSnap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Save new structure
    for (const floor of floors) {
      const floorRef = adminDb
        .collection('locations')
        .doc(locationId)
        .collection('floors')
        .doc(floor.id);
      
      batch.set(floorRef, {
        name: floor.name,
        sortOrder: floor.sortOrder,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      for (const room of floor.rooms) {
        const roomRef = floorRef.collection('rooms').doc(room.id);
        
        batch.set(roomRef, {
          name: room.name,
          type: room.type,
          icon: room.icon,
          sortOrder: room.sortOrder,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        for (const target of room.targets) {
          const targetRef = roomRef.collection('targets').doc(target.id);
          
          batch.set(targetRef, {
            name: target.name,
            icon: target.icon,
            sortOrder: target.sortOrder,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          for (const action of target.actions) {
            const actionRef = targetRef.collection('actions').doc(action.id);
            
            batch.set(actionRef, {
              name: action.name,
              durationMinutes: action.durationMinutes,
              sortOrder: action.sortOrder,
              tools: action.tools || [],
              instructions: action.instructions || '',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
      }
    }

    await batch.commit();
    console.log(`[Structure] Saved to Firestore`);

    // Also sync to SQL for Robot Intelligence queries
    // (This is simplified - you may want to expand)
    try {
      for (const floor of floors) {
        await sql.query(
          `INSERT INTO location_floors (id, location_id, name, sort_order, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             sort_order = EXCLUDED.sort_order,
             updated_at = NOW()`,
          [floor.id, locationId, floor.name, floor.sortOrder]
        );

        for (const room of floor.rooms) {
          await sql.query(
            `INSERT INTO location_rooms (id, location_id, floor_id, custom_name, sort_order, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
             ON CONFLICT (id) DO UPDATE SET
               custom_name = EXCLUDED.custom_name,
               sort_order = EXCLUDED.sort_order,
               updated_at = NOW()`,
            [room.id, locationId, floor.id, room.name, room.sortOrder]
          );
        }
      }
      console.log(`[Structure] Synced to SQL`);
    } catch (sqlError) {
      console.error(`[Structure] SQL sync failed:`, sqlError);
      // Don't fail the request - Firestore is source of truth
    }

    return NextResponse.json({
      success: true,
      message: 'Structure saved',
      floors: floors.length,
    });

  } catch (error: any) {
    console.error('[Structure] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save structure' },
      { status: 500 }
    );
  }
}

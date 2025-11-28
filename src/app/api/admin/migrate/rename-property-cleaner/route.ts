/**
 * MIGRATION: Rename property_cleaner → location_cleaner
 * DELETE AFTER SUCCESSFUL EXECUTION
 */

import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    console.log('🚀 Starting property_cleaner → location_cleaner migration...');

    const stats = {
      usersUpdated: 0,
      authUpdated: 0,
      errors: [] as any[],
    };

    // Update Firestore users
    const usersSnapshot = await adminDb
      .collection('users')
      .where('role', '==', 'property_cleaner')
      .get();

    console.log(`Found ${usersSnapshot.size} users with property_cleaner role`);

    for (const userDoc of usersSnapshot.docs) {
      try {
        // Update Firestore
        await adminDb.collection('users').doc(userDoc.id).update({
          role: 'location_cleaner',
          updated_at: new Date(),
        });
        stats.usersUpdated++;

        // Update Auth custom claims
        const user = await adminAuth.getUser(userDoc.id);
        const claims = user.customClaims || {};
        await adminAuth.setCustomUserClaims(userDoc.id, {
          ...claims,
          role: 'location_cleaner',
        });
        stats.authUpdated++;

        console.log(`✓ Updated ${userDoc.data().email}`);
      } catch (error: any) {
        stats.errors.push({
          uid: userDoc.id,
          error: error.message,
        });
        console.error(`✗ Error updating ${userDoc.id}:`, error.message);
      }
    }

    console.log('\n✅ Migration complete!');
    console.log(JSON.stringify(stats, null, 2));

    return NextResponse.json({
      success: true,
      message: 'property_cleaner renamed to location_cleaner',
      stats,
    });
  } catch (error: any) {
    console.error('💥 Migration failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}


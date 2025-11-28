import { adminDb } from '@/lib/firebaseAdmin';

/**
 * Migrate all tasks from propertyId to locationId
 * Run this once to update existing data
 */
export async function migratePropertyIdToLocationId() {
  try {
    console.log('🔄 Starting migration: propertyId → locationId');
    
    const tasksSnap = await adminDb.collection('tasks').get();
    console.log(`Found ${tasksSnap.size} tasks to migrate`);
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const doc of tasksSnap.docs) {
      const data = doc.data();
      
      // Skip if already has locationId
      if (data.locationId) {
        console.log(`✓ ${doc.id}: Already has locationId, skipping`);
        skipped++;
        continue;
      }
      
      // Skip if no propertyId to migrate
      if (!data.propertyId) {
        console.warn(`⚠ ${doc.id}: No propertyId or locationId found`);
        skipped++;
        continue;
      }
      
      try {
        // Add locationId field (copy from propertyId)
        await doc.ref.update({
          locationId: data.propertyId,
          // Keep propertyId for now (for backwards compatibility)
          // We can remove it later after verifying everything works
        });
        
        console.log(`✓ ${doc.id}: Migrated propertyId → locationId (${data.propertyId})`);
        migrated++;
      } catch (error: any) {
        console.error(`✗ ${doc.id}: Migration failed:`, error.message);
        errors++;
      }
    }
    
    console.log('\n🔄 Migration complete!');
    console.log(`  Migrated: ${migrated}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Errors: ${errors}`);
    
    return { migrated, skipped, errors };
  } catch (error: any) {
    console.error('Migration failed:', error);
    throw error;
  }
}


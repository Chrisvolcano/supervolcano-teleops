/**
 * UPDATE TEST CLEANER FIELDS
 * Updates test cleaner document to use displayName and add organization fields
 * Last updated: 2025-11-26
 */

import { config } from "dotenv";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });

async function updateTestCleaner() {
  const { adminAuth, adminDb } = await import("../src/lib/firebaseAdmin");
  const { FieldValue } = await import("firebase-admin/firestore");
  
  const email = 'testcleaner@supervolcano.com';
  
  try {
    console.log('🔧 Updating test cleaner document...');
    
    // Get user
    const user = await adminAuth.getUserByEmail(email);
    console.log('✅ Found user:', user.uid);
    
    // Get existing document
    const userDocRef = adminDb.collection('users').doc(user.uid);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
      console.error('❌ User document does not exist!');
      process.exit(1);
    }
    
    const currentData = userDoc.data();
    console.log('📋 Current data:', currentData);
    
    // Find an existing field_operator to copy organization fields from
    console.log('\n🔍 Looking for existing field_operator to copy organization fields...');
    const existingOperators = await adminDb
      .collection('users')
      .where('role', '==', 'field_operator')
      .limit(1)
      .get();
    
    let organizationId = currentData?.organizationId;
    let partnerId = currentData?.partnerId;
    
    if (!organizationId || !partnerId) {
      // Try to find any user with organization fields
      const usersWithOrg = await adminDb
        .collection('users')
        .where('organizationId', '!=', null)
        .limit(1)
        .get();
      
      if (!usersWithOrg.empty) {
        const sampleUser = usersWithOrg.docs[0].data();
        organizationId = sampleUser.organizationId || organizationId;
        partnerId = sampleUser.partnerId || partnerId;
        console.log('📋 Found user with org fields:');
        console.log('   organizationId:', organizationId);
        console.log('   partnerId:', partnerId);
      } else {
        // Use default values from known organizations
        organizationId = organizationId || '9a5f4710-9b1a-457c-b734-c3aed71a860a';
        partnerId = partnerId || 'demo-org';
        console.log('⚠️  No users with org fields found, using defaults');
        console.log('   organizationId:', organizationId);
        console.log('   partnerId:', partnerId);
      }
    }
    
    // Prepare update
    const updateData: any = {
      displayName: currentData?.name || currentData?.displayName || 'Test Cleaner',
      updated_at: FieldValue.serverTimestamp(),
    };
    
    // Add organization fields if missing
    if (!currentData?.organizationId && organizationId) {
      updateData.organizationId = organizationId;
    }
    if (!currentData?.partnerId && partnerId) {
      updateData.partnerId = partnerId;
    }
    
    // Remove legacy name field if displayName exists
    if (currentData?.name && currentData?.displayName) {
      console.log('⚠️  Both name and displayName exist, keeping displayName');
    }
    
    console.log('\n📝 Updating document with:');
    console.log(JSON.stringify(updateData, null, 2));
    
    await userDocRef.update(updateData);
    
    // Verify update
    const updatedDoc = await userDocRef.get();
    const updatedData = updatedDoc.data();
    
    console.log('\n✅ Update complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Updated document:');
    console.log('   displayName:', updatedData?.displayName);
    console.log('   name (legacy):', updatedData?.name);
    console.log('   organizationId:', updatedData?.organizationId);
    console.log('   partnerId:', updatedData?.partnerId);
    console.log('   role:', updatedData?.role);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Test query
    console.log('🔍 Testing query for field_operator users...');
    const querySnapshot = await adminDb
      .collection('users')
      .where('role', '==', 'field_operator')
      .get();
    
    const validOperators = querySnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.organizationId && data.partnerId;
    });
    
    console.log(`   Found ${validOperators.length} field_operator user(s) with org fields:`);
    validOperators.forEach(doc => {
      const data = doc.data();
      const name = data.displayName || data.name || data.email;
      console.log(`   ✅ ${name} (${doc.id})`);
    });
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error updating test cleaner:', error);
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    process.exit(1);
  }
}

updateTestCleaner();


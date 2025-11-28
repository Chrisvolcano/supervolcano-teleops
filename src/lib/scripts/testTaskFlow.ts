import { adminDb } from '@/lib/firebaseAdmin';

/**
 * Test the entire task creation and retrieval flow
 */
export async function testTaskFlow() {
  const testLocationId = 'bd577ffe-d733-4002-abb8-9ea047c0f326'; // Isaac's House
  
  console.log('\n🧪 === TASK FLOW TEST ===\n');
  
  try {
    // Step 1: Create test task
    console.log('1️⃣ Creating test task in Firestore...');
    const taskData = {
      title: 'TEST TASK - DELETE ME',
      description: 'This is a test task',
      category: 'cleaning',
      locationId: testLocationId,
      locationName: "Isaac's House",
      estimatedDuration: 10,
      priority: 'medium',
      status: 'available',
      state: 'available',
      assigned_to: 'unassigned',
      createdAt: new Date(),
      createdBy: 'test-script',
      updatedAt: new Date(),
      partnerOrgId: 'demo-org',
    };
    
    const docRef = await adminDb.collection('tasks').add(taskData);
    console.log('✅ Task created with ID:', docRef.id);
    
    // Step 2: Verify task exists
    console.log('\n2️⃣ Verifying task exists...');
    const taskDoc = await docRef.get();
    if (!taskDoc.exists) {
      throw new Error('Task document not found!');
    }
    console.log('✅ Task exists in Firestore');
    const savedData = taskDoc.data();
    if (!savedData) {
      throw new Error('Task document has no data!');
    }
    console.log('   Data:', {
      id: docRef.id,
      title: savedData.title,
      locationId: savedData.locationId,
      createdAt: savedData.createdAt,
    });
    
    // Step 3: Query tasks by location
    console.log('\n3️⃣ Querying tasks by locationId...');
    const tasksSnap = await adminDb
      .collection('tasks')
      .where('locationId', '==', testLocationId)
      .get();
    console.log('✅ Found', tasksSnap.size, 'tasks for this location');
    tasksSnap.docs.forEach(doc => {
      const data = doc.data();
      console.log('   -', data.title, `(${doc.id})`);
      console.log('     locationId:', data.locationId);
    });
    
    // Step 4: Clean up test task
    console.log('\n4️⃣ Cleaning up test task...');
    await docRef.delete();
    console.log('✅ Test task deleted');
    
    console.log('\n✅ === ALL TESTS PASSED ===\n');
    return { success: true, message: 'All tests passed' };
  } catch (error: any) {
    console.error('\n❌ === TEST FAILED ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return { success: false, error: error.message };
  }
}


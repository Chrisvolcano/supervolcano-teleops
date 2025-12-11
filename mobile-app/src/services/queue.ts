import AsyncStorage from '@react-native-async-storage/async-storage';
import { UploadQueueItem } from '../types';
import { uploadVideoToFirebase, deleteLocalVideo } from './upload';
import { saveMediaMetadata } from './api';

const QUEUE_KEY = 'upload_queue';
const PROCESSING_LOCK_KEY = 'queue_processing_lock';

/**
 * Add video to upload queue
 */
export async function addToQueue(item: Omit<UploadQueueItem, 'id' | 'status'>) {
  const queue = await getQueue();
  
  const queueItem: UploadQueueItem = {
    ...item,
    id: Date.now().toString(),
    status: 'pending',
  };
  
  queue.push(queueItem);
  await saveQueue(queue);
  
  return queueItem;
}

/**
 * Get upload queue
 */
export async function getQueue(): Promise<UploadQueueItem[]> {
  try {
    const queueJson = await AsyncStorage.getItem(QUEUE_KEY);
    if (!queueJson) {
      return [];
    }
    
    const queue = JSON.parse(queueJson);
    
    // Convert timestamp strings back to Date objects
    return queue.map((item: any) => ({
      ...item,
      timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
    }));
  } catch (error) {
    console.error('Failed to get queue:', error);
    return [];
  }
}

/**
 * Save upload queue
 */
async function saveQueue(queue: UploadQueueItem[]) {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to save queue:', error);
  }
}

/**
 * Check if queue is currently being processed
 */
async function isProcessing(): Promise<boolean> {
  const lock = await AsyncStorage.getItem(PROCESSING_LOCK_KEY);
  if (!lock) return false;
  
  // Lock expires after 5 minutes (in case app crashes mid-process)
  const lockTime = parseInt(lock, 10);
  if (Date.now() - lockTime > 5 * 60 * 1000) {
    await AsyncStorage.removeItem(PROCESSING_LOCK_KEY);
    return false;
  }
  return true;
}

/**
 * Set processing lock
 */
async function setProcessingLock(active: boolean) {
  if (active) {
    await AsyncStorage.setItem(PROCESSING_LOCK_KEY, Date.now().toString());
  } else {
    await AsyncStorage.removeItem(PROCESSING_LOCK_KEY);
  }
}

/**
 * Process upload queue
 */
export async function processQueue(
  onItemProgress?: (item: UploadQueueItem, progress: number) => void
) {
  console.log('═══════════════════════════════════════');
  console.log('🔄 PROCESS QUEUE START');
  console.log('═══════════════════════════════════════');
  
  // Check if already processing
  if (await isProcessing()) {
    console.log('⏳ Queue already being processed, skipping...');
    return;
  }
  
  // Set lock
  await setProcessingLock(true);
  
  try {
    const queue = await getQueue();
    console.log('Total items in queue:', queue.length);
    
    const pendingItems = queue.filter(item => item.status === 'pending');
    console.log('Pending items:', pendingItems.length);
    
    if (pendingItems.length === 0) {
      console.log('No pending uploads to process');
      return;
    }
    
    for (const item of pendingItems) {
      // Re-check status in case another process updated it
      const currentQueue = await getQueue();
      const currentItem = currentQueue.find(q => q.id === item.id);
      if (!currentItem || currentItem.status === 'uploading' || currentItem.status === 'success') {
        console.log(`⏭️ Skipping ${item.id} - status is ${currentItem?.status}`);
        continue;
      }
      
      // Update item reference to current state
      const itemToProcess = currentItem;
      console.log('\n═══════════════════════════════════════');
      console.log(`📤 Processing: ${itemToProcess.jobTitle}`);
      console.log('═══════════════════════════════════════');
      console.log('Item ID:', itemToProcess.id);
      console.log('Video URI:', itemToProcess.videoUri);
      console.log('Location ID:', itemToProcess.locationId);
      console.log('Job ID:', itemToProcess.jobId);
      console.log('Current status:', itemToProcess.status);
      
      try {
        // Update status to uploading
        console.log('\n📝 Updating status to uploading...');
        itemToProcess.status = 'uploading';
        const updatedQueue = await getQueue();
        const queueItemIndex = updatedQueue.findIndex(q => q.id === itemToProcess.id);
        if (queueItemIndex !== -1) {
          updatedQueue[queueItemIndex] = itemToProcess;
          await saveQueue(updatedQueue);
        }
        console.log('✅ Status updated');
        
        // Upload video (now returns metadata too)
        console.log('\n⬆️ Starting video upload to Firebase Storage...');
        const uploadResult = await uploadVideoToFirebase(
          itemToProcess.videoUri,
          itemToProcess.locationId,
          itemToProcess.jobId,
          (progress) => {
            itemToProcess.progress = progress.progress;
            onItemProgress?.(itemToProcess, progress.progress);
          }
        );
        
        console.log('✅ Video uploaded to Storage');
        console.log('Storage URL:', uploadResult.storageUrl.substring(0, 100) + '...');
        console.log('File size:', uploadResult.fileSize, 'bytes');
        
        itemToProcess.storageUrl = uploadResult.storageUrl;
        
        // Save metadata with duration and file size
        console.log('\n💾 Saving metadata to Firestore via API...');
        console.log('API URL:', process.env.EXPO_PUBLIC_API_BASE_URL);
        
        // Ensure timestamp is a Date object
        const timestamp = itemToProcess.timestamp instanceof Date 
          ? itemToProcess.timestamp 
          : new Date(itemToProcess.timestamp || Date.now());
        
        const fileName = `video-${timestamp.getTime()}.mp4`;
        console.log('File name:', fileName);
        console.log('Metadata payload:', {
          taskId: itemToProcess.jobId,
          locationId: itemToProcess.locationId,
          fileSize: uploadResult.fileSize,
          durationSeconds: uploadResult.durationSeconds,
          fileName,
        });
        
        await saveMediaMetadata({
          taskId: itemToProcess.jobId,
          locationId: itemToProcess.locationId,
          storageUrl: uploadResult.storageUrl,
          fileName: fileName,
          fileSize: uploadResult.fileSize,
          mimeType: 'video/mp4',
          durationSeconds: uploadResult.durationSeconds,
        });
        
        console.log('✅ Metadata saved to Firestore');
        
        // Delete local video
        console.log('\n🗑️ Deleting local video file...');
        await deleteLocalVideo(itemToProcess.videoUri);
        console.log('✅ Local file cleanup complete');
        
        // Mark as success
        itemToProcess.status = 'success';
        itemToProcess.progress = 100;
        const finalQueue = await getQueue();
        const finalItemIndex = finalQueue.findIndex(q => q.id === itemToProcess.id);
        if (finalItemIndex !== -1) {
          finalQueue[finalItemIndex] = itemToProcess;
          await saveQueue(finalQueue);
        }
        
        console.log('═══════════════════════════════════════');
        console.log(`✅ SUCCESS: ${itemToProcess.jobTitle}`);
        console.log('═══════════════════════════════════════');
      } catch (error: any) {
        console.error('═══════════════════════════════════════');
        console.error(`❌ FAILED: ${itemToProcess.jobTitle}`);
        console.error('═══════════════════════════════════════');
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error stack:', error.stack);
        console.error('Full error:', JSON.stringify(error, null, 2));
        
        itemToProcess.status = 'error';
        itemToProcess.error = error.message || 'Unknown error';
        const errorQueue = await getQueue();
        const errorItemIndex = errorQueue.findIndex(q => q.id === itemToProcess.id);
        if (errorItemIndex !== -1) {
          errorQueue[errorItemIndex] = itemToProcess;
          await saveQueue(errorQueue);
        }
        
        console.error('Item marked as error, will retry on next attempt');
      }
    }
  } finally {
    // Always release lock
    await setProcessingLock(false);
  }
  
  console.log('\n═══════════════════════════════════════');
  console.log('🔄 PROCESS QUEUE COMPLETE');
  console.log('═══════════════════════════════════════');
}

/**
 * Clear completed items from queue
 */
export async function clearCompleted() {
  const queue = await getQueue();
  const filtered = queue.filter(item => item.status !== 'success');
  await saveQueue(filtered);
}


import AsyncStorage from '@react-native-async-storage/async-storage';
import { UploadQueueItem } from '../types';
import { uploadVideoToFirebase, deleteLocalVideo } from './upload';
import { saveMediaMetadata } from './api';

const QUEUE_KEY = 'upload_queue';

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
 * Process upload queue
 */
export async function processQueue(
  onItemProgress?: (item: UploadQueueItem, progress: number) => void
) {
  console.log('═══════════════════════════════════════');
  console.log('🔄 PROCESS QUEUE START');
  console.log('═══════════════════════════════════════');
  
  const queue = await getQueue();
  console.log('Total items in queue:', queue.length);
  
  const pendingItems = queue.filter(item => item.status === 'pending' || item.status === 'error');
  console.log('Pending items:', pendingItems.length);
  
  if (pendingItems.length === 0) {
    console.log('No pending uploads to process');
    return;
  }
  
  for (const item of pendingItems) {
    console.log('\n═══════════════════════════════════════');
    console.log(`📤 Processing: ${item.jobTitle}`);
    console.log('═══════════════════════════════════════');
    console.log('Item ID:', item.id);
    console.log('Video URI:', item.videoUri);
    console.log('Location ID:', item.locationId);
    console.log('Job ID:', item.jobId);
    console.log('Current status:', item.status);
    
    try {
      // Update status to uploading
      console.log('\n📝 Updating status to uploading...');
      item.status = 'uploading';
      await saveQueue(queue);
      console.log('✅ Status updated');
      
      // Upload video (now returns metadata too)
      console.log('\n⬆️ Starting video upload to Firebase Storage...');
      const uploadResult = await uploadVideoToFirebase(
        item.videoUri,
        item.locationId,
        item.jobId,
        (progress) => {
          item.progress = progress.progress;
          onItemProgress?.(item, progress.progress);
        }
      );
      
      console.log('✅ Video uploaded to Storage');
      console.log('Storage URL:', uploadResult.storageUrl.substring(0, 100) + '...');
      console.log('File size:', uploadResult.fileSize, 'bytes');
      
      item.storageUrl = uploadResult.storageUrl;
      
      // Save metadata with duration and file size
      console.log('\n💾 Saving metadata to Firestore via API...');
      console.log('API URL:', process.env.EXPO_PUBLIC_API_BASE_URL);
      
      // Ensure timestamp is a Date object
      const timestamp = item.timestamp instanceof Date 
        ? item.timestamp 
        : new Date(item.timestamp || Date.now());
      
      const fileName = `video-${timestamp.getTime()}.mp4`;
      console.log('File name:', fileName);
      console.log('Metadata payload:', {
        taskId: item.jobId,
        locationId: item.locationId,
        fileSize: uploadResult.fileSize,
        durationSeconds: uploadResult.durationSeconds,
        fileName,
      });
      
      await saveMediaMetadata({
        taskId: item.jobId,
        locationId: item.locationId,
        storageUrl: uploadResult.storageUrl,
        fileName: fileName,
        fileSize: uploadResult.fileSize,
        mimeType: 'video/mp4',
        durationSeconds: uploadResult.durationSeconds,
      });
      
      console.log('✅ Metadata saved to Firestore');
      
      // Delete local video
      console.log('\n🗑️ Deleting local video file...');
      await deleteLocalVideo(item.videoUri);
      console.log('✅ Local file cleanup complete');
      
      // Mark as success
      item.status = 'success';
      item.progress = 100;
      await saveQueue(queue);
      
      console.log('═══════════════════════════════════════');
      console.log(`✅ SUCCESS: ${item.jobTitle}`);
      console.log('═══════════════════════════════════════');
    } catch (error: any) {
      console.error('═══════════════════════════════════════');
      console.error(`❌ FAILED: ${item.jobTitle}`);
      console.error('═══════════════════════════════════════');
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error stack:', error.stack);
      console.error('Full error:', JSON.stringify(error, null, 2));
      
      item.status = 'error';
      item.error = error.message || 'Unknown error';
      await saveQueue(queue);
      
      console.error('Item marked as error, will retry on next attempt');
    }
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


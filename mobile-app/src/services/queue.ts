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
    return queueJson ? JSON.parse(queueJson) : [];
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
  const queue = await getQueue();
  const pendingItems = queue.filter(item => item.status === 'pending' || item.status === 'error');
  
  console.log(`Processing ${pendingItems.length} pending uploads`);
  
  for (const item of pendingItems) {
    try {
      // Update status to uploading
      item.status = 'uploading';
      await saveQueue(queue);
      
      // Upload video (now returns metadata too)
      const uploadResult = await uploadVideoToFirebase(
        item.videoUri,
        item.locationId,
        item.jobId,
        (progress) => {
          item.progress = progress.progress;
          onItemProgress?.(item, progress.progress);
        }
      );
      
      item.storageUrl = uploadResult.storageUrl;
      
      // Save metadata with duration and file size
      await saveMediaMetadata({
        taskId: item.jobId,
        locationId: item.locationId,
        storageUrl: uploadResult.storageUrl,
        fileName: `video-${item.timestamp.getTime()}.mp4`,
        fileSize: uploadResult.fileSize,
        mimeType: 'video/mp4',
        durationSeconds: uploadResult.durationSeconds,
      });
      
      // Delete local video
      await deleteLocalVideo(item.videoUri);
      
      // Mark as success
      item.status = 'success';
      item.progress = 100;
      await saveQueue(queue);
      
      console.log(`Successfully uploaded: ${item.jobTitle}`);
    } catch (error: any) {
      console.error(`Failed to upload ${item.jobTitle}:`, error);
      item.status = 'error';
      item.error = error.message;
      await saveQueue(queue);
    }
  }
}

/**
 * Clear completed items from queue
 */
export async function clearCompleted() {
  const queue = await getQueue();
  const filtered = queue.filter(item => item.status !== 'success');
  await saveQueue(filtered);
}


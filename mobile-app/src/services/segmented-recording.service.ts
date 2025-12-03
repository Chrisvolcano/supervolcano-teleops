/**
 * SEGMENTED RECORDING MANAGER
 * Handles automatic 5-minute segmenting with background upload
 * 
 * Flow:
 * 1. Start recording
 * 2. After 5 minutes: stop → upload → restart
 * 3. Repeat until session ends
 * 4. Upload final segment
 */

import { goProService } from './gopro.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';

const SEGMENT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const UPLOAD_QUEUE_KEY = 'gopro_upload_queue';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || '';

interface Segment {
  id: string;
  sessionId: string;
  locationId: string;
  segmentNumber: number;
  folder: string;
  filename: string;
  lrvFilename: string;  // Low-res proxy
  status: 'recording' | 'pending_upload' | 'uploading' | 'complete' | 'failed';
  startedAt: Date;
  endedAt?: Date;
  uploadAttempts: number;
}

interface RecordingSession {
  sessionId: string;
  locationId: string;
  segments: Segment[];
  currentSegment: Segment | null;
  isActive: boolean;
  startedAt: Date;
}

class SegmentedRecordingManager {
  private currentSession: RecordingSession | null = null;
  private segmentTimer: NodeJS.Timeout | null = null;
  private uploadInProgress: boolean = false;
  private listeners: ((session: RecordingSession | null) => void)[] = [];

  /**
   * Start a new segmented recording session
   */
  async startSession(sessionId: string, locationId: string, wifiSSID?: string, wifiPassword?: string): Promise<boolean> {
    console.log('[SegmentedRecording] Starting session:', sessionId);

    try {
      // Connect GoPro to property WiFi if credentials provided
      if (wifiSSID && wifiPassword) {
        console.log('[SegmentedRecording] Connecting GoPro to property WiFi...');
        await goProService.connectToWiFi(wifiSSID, wifiPassword);
      }

      // Initialize session
      this.currentSession = {
        sessionId,
        locationId,
        segments: [],
        currentSegment: null,
        isActive: true,
        startedAt: new Date(),
      };

      // Start first segment
      await this.startNewSegment();

      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('[SegmentedRecording] Failed to start session:', error);
      return false;
    }
  }

  /**
   * End the current recording session
   */
  async endSession(): Promise<void> {
    console.log('[SegmentedRecording] Ending session');

    if (!this.currentSession) return;

    // Stop the segment timer
    if (this.segmentTimer) {
      clearTimeout(this.segmentTimer);
      this.segmentTimer = null;
    }

    // Stop recording
    await goProService.stopRecording();

    // Finalize current segment
    if (this.currentSession.currentSegment) {
      this.currentSession.currentSegment.endedAt = new Date();
      this.currentSession.currentSegment.status = 'pending_upload';
      
      // Get the last captured file info
      await this.captureSegmentFileInfo(this.currentSession.currentSegment);
      
      // Queue for upload
      await this.queueSegmentForUpload(this.currentSession.currentSegment);
    }

    this.currentSession.isActive = false;
    this.notifyListeners();

    // Process upload queue
    this.processUploadQueue();
  }

  /**
   * Start a new recording segment
   */
  private async startNewSegment(): Promise<void> {
    if (!this.currentSession) return;

    const segmentNumber = this.currentSession.segments.length + 1;
    console.log(`[SegmentedRecording] Starting segment ${segmentNumber}`);

    // Create new segment
    const segment: Segment = {
      id: `${this.currentSession.sessionId}-seg${segmentNumber}`,
      sessionId: this.currentSession.sessionId,
      locationId: this.currentSession.locationId,
      segmentNumber,
      folder: '',  // Will be filled after recording
      filename: '',  // Will be filled after recording
      lrvFilename: '',  // Will be filled after recording
      status: 'recording',
      startedAt: new Date(),
      uploadAttempts: 0,
    };

    this.currentSession.currentSegment = segment;
    this.currentSession.segments.push(segment);

    // Start recording
    await goProService.startRecording();

    // Set timer for segment duration
    this.segmentTimer = setTimeout(() => {
      this.rotateSegment();
    }, SEGMENT_DURATION_MS);

    this.notifyListeners();
  }

  /**
   * Rotate to next segment (stop current, start new)
   */
  private async rotateSegment(): Promise<void> {
    if (!this.currentSession?.isActive) return;

    console.log('[SegmentedRecording] Rotating segment...');

    // Stop current recording
    await goProService.stopRecording();

    // Finalize current segment
    if (this.currentSession.currentSegment) {
      this.currentSession.currentSegment.endedAt = new Date();
      this.currentSession.currentSegment.status = 'pending_upload';
      
      // Get the file info
      await this.captureSegmentFileInfo(this.currentSession.currentSegment);
      
      // Queue for background upload
      await this.queueSegmentForUpload(this.currentSession.currentSegment);
    }

    // Start new segment immediately (minimize gap)
    await this.startNewSegment();

    // Process upload queue in background
    this.processUploadQueue();
  }

  /**
   * Capture the file info for a completed segment
   */
  private async captureSegmentFileInfo(segment: Segment): Promise<void> {
    try {
      const baseUrl = await this.getHttpBaseUrl();
      if (!baseUrl) return;

      // Get last captured media
      const response = await fetch(`${baseUrl}/gopro/media/last_captured`);
      const data = await response.json();

      if (data.file) {
        segment.folder = data.folder || '100GOPRO';
        segment.filename = data.file;
        segment.lrvFilename = data.file.replace('.MP4', '.LRV');
      }
    } catch (error) {
      console.error('[SegmentedRecording] Failed to get segment file info:', error);
    }
  }

  /**
   * Queue segment for upload
   */
  private async queueSegmentForUpload(segment: Segment): Promise<void> {
    const queueJson = await AsyncStorage.getItem(UPLOAD_QUEUE_KEY);
    const queue: Segment[] = queueJson ? JSON.parse(queueJson) : [];
    queue.push(segment);
    await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(queue));
    console.log('[SegmentedRecording] Queued segment for upload:', segment.id);
  }

  /**
   * Process the upload queue (background)
   */
  private async processUploadQueue(): Promise<void> {
    if (this.uploadInProgress) return;
    this.uploadInProgress = true;

    console.log('[SegmentedRecording] Processing upload queue...');

    try {
      const queueJson = await AsyncStorage.getItem(UPLOAD_QUEUE_KEY);
      if (!queueJson) {
        this.uploadInProgress = false;
        return;
      }

      const queue: Segment[] = JSON.parse(queueJson);
      const pending = queue.filter(s => s.status === 'pending_upload' && s.uploadAttempts < 3);

      for (const segment of pending) {
        try {
          console.log(`[SegmentedRecording] Uploading segment ${segment.segmentNumber}...`);
          segment.status = 'uploading';
          await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(queue));

          // Download LRV (low-res proxy) from GoPro - faster upload
          const fileData = await goProService.downloadFile(segment.folder, segment.lrvFilename);

          if (!fileData) {
            throw new Error('Download failed');
          }

          // Upload to SuperVolcano API
          const token = await auth.currentUser?.getIdToken();
          const response = await fetch(
            `${API_BASE_URL}/api/sessions/${segment.sessionId}/media`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                segmentId: segment.id,
                segmentNumber: segment.segmentNumber,
                filename: segment.lrvFilename,
                data: fileData,
                locationId: segment.locationId,
                startedAt: segment.startedAt.toISOString(),
                endedAt: segment.endedAt?.toISOString(),
              }),
            }
          );

          if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
          }

          // Delete from GoPro after successful upload (save SD space)
          await goProService.deleteFile(segment.folder, segment.lrvFilename);
          // Optionally delete full res too, or keep for quality uploads later
          // await goProService.deleteFile(segment.folder, segment.filename);

          segment.status = 'complete';
          console.log(`[SegmentedRecording] Segment ${segment.segmentNumber} uploaded successfully`);

        } catch (error) {
          console.error(`[SegmentedRecording] Upload failed for segment ${segment.segmentNumber}:`, error);
          segment.status = 'pending_upload';
          segment.uploadAttempts++;
        }

        await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(queue));
      }

      // Remove completed segments from queue
      const updatedQueue = queue.filter(s => s.status !== 'complete');
      await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(updatedQueue));

    } catch (error) {
      console.error('[SegmentedRecording] Queue processing error:', error);
    }

    this.uploadInProgress = false;
  }

  /**
   * Get HTTP base URL
   */
  private async getHttpBaseUrl(): Promise<string | null> {
    try {
      const response = await fetch('http://10.5.5.9:8080/gopro/camera/state', {
        signal: AbortSignal.timeout(2000),
      });
      if (response.ok) {
        return 'http://10.5.5.9:8080';
      }
    } catch {
      // Not connected
    }
    return null;
  }

  /**
   * Subscribe to session changes
   */
  onSessionChange(callback: (session: RecordingSession | null) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(cb => cb(this.currentSession));
  }

  /**
   * Get current session
   */
  getCurrentSession(): RecordingSession | null {
    return this.currentSession;
  }

  /**
   * Get recording stats
   */
  getStats(): { segmentCount: number; uploadedCount: number; pendingCount: number } {
    if (!this.currentSession) {
      return { segmentCount: 0, uploadedCount: 0, pendingCount: 0 };
    }
    
    const segments = this.currentSession.segments;
    return {
      segmentCount: segments.length,
      uploadedCount: segments.filter(s => s.status === 'complete').length,
      pendingCount: segments.filter(s => s.status === 'pending_upload' || s.status === 'uploading').length,
    };
  }
}

export const segmentedRecordingManager = new SegmentedRecordingManager();


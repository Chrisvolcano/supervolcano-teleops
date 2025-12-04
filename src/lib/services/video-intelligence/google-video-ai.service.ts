/**
 * Google Cloud Video Intelligence Service
 * 
 * Handles video annotation using Google Cloud Video Intelligence API.
 * Free tier: 1,000 minutes/month per feature.
 * 
 * Features used:
 * - LABEL_DETECTION: Identify objects, locations, activities
 * - OBJECT_TRACKING: Track objects through video
 * - TEXT_DETECTION: Read text/labels in video
 * - SHOT_CHANGE_DETECTION: Identify scene changes
 */

import { VideoIntelligenceServiceClient, protos } from '@google-cloud/video-intelligence';

// Type aliases for cleaner code
type IAnnotateVideoRequest = protos.google.cloud.videointelligence.v1.IAnnotateVideoRequest;
type IVideoAnnotationResults = protos.google.cloud.videointelligence.v1.IVideoAnnotationResults;
type Feature = protos.google.cloud.videointelligence.v1.Feature;

export interface VideoAnnotations {
  labels: Array<{
    description: string;
    confidence: number;
    segments: Array<{
      startTime: number;
      endTime: number;
    }>;
  }>;
  objects: Array<{
    description: string;
    confidence: number;
    trackId: number;
    frames: Array<{
      time: number;
      boundingBox: {
        left: number;
        top: number;
        right: number;
        bottom: number;
      };
    }>;
  }>;
  text: Array<{
    text: string;
    confidence: number;
    segments: Array<{
      startTime: number;
      endTime: number;
    }>;
  }>;
  shots: Array<{
    startTime: number;
    endTime: number;
  }>;
  processedAt: string;
  processingTimeMs: number;
}

export interface ProcessingResult {
  success: boolean;
  annotations?: VideoAnnotations;
  error?: string;
}

class GoogleVideoAIService {
  private client: VideoIntelligenceServiceClient | null = null;
  private initialized = false;

  /**
   * Initialize the Video Intelligence client
   * Credentials loaded from environment
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Parse credentials from environment if provided as JSON string
      const credentialsJson = process.env.GOOGLE_CLOUD_CREDENTIALS;
      
      if (credentialsJson) {
        const credentials = JSON.parse(credentialsJson);
        this.client = new VideoIntelligenceServiceClient({
          credentials,
          projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.FIREBASE_ADMIN_PROJECT_ID,
        });
      } else {
        // Fall back to GOOGLE_APPLICATION_CREDENTIALS file path
        this.client = new VideoIntelligenceServiceClient({
          projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.FIREBASE_ADMIN_PROJECT_ID,
        });
      }

      this.initialized = true;
      console.log('[VideoAI] Google Cloud Video Intelligence client initialized');
    } catch (error: any) {
      console.error('[VideoAI] Failed to initialize client:', error.message);
      throw new Error(`Failed to initialize Video AI client: ${error.message}`);
    }
  }

  /**
   * Annotate a video stored in Google Cloud Storage or accessible via URL
   * 
   * @param videoUri - GCS URI (gs://bucket/path) or HTTPS URL
   * @param features - Which annotation features to run
   * @returns Processed annotations
   */
  async annotateVideo(
    videoUri: string,
    features: ('LABEL' | 'OBJECT' | 'TEXT' | 'SHOT')[] = ['LABEL', 'OBJECT', 'TEXT', 'SHOT']
  ): Promise<ProcessingResult> {
    await this.initialize();

    if (!this.client) {
      return { success: false, error: 'Video AI client not initialized' };
    }

    const startTime = Date.now();

    try {
      // Map feature names to API enums
      const featureMap: Record<string, string> = {
        'LABEL': 'LABEL_DETECTION',
        'OBJECT': 'OBJECT_TRACKING',
        'TEXT': 'TEXT_DETECTION',
        'SHOT': 'SHOT_CHANGE_DETECTION',
      };

      const requestFeatures = features.map(f => featureMap[f] as Feature).filter(Boolean) as Feature[];

      const request: IAnnotateVideoRequest = {
        inputUri: videoUri,
        features: requestFeatures,
      };

      console.log(`[VideoAI] Starting annotation for: ${videoUri}`);
      console.log(`[VideoAI] Features: ${features.join(', ')}`);

      // Start the long-running operation
      const [operation] = await this.client.annotateVideo(request);

      // Wait for completion
      const [response] = await operation.promise();

      const results = response.annotationResults?.[0];
      
      if (!results) {
        return { success: false, error: 'No annotation results returned' };
      }

      const annotations = this.parseResults(results);
      annotations.processingTimeMs = Date.now() - startTime;

      console.log(`[VideoAI] Annotation complete in ${annotations.processingTimeMs}ms`);
      console.log(`[VideoAI] Found: ${annotations.labels.length} labels, ${annotations.objects.length} objects, ${annotations.text.length} text items`);

      return { success: true, annotations };
    } catch (error: any) {
      console.error('[VideoAI] Annotation failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Annotate video from raw bytes (for smaller videos)
   * 
   * @param videoBuffer - Video file as Buffer
   * @param features - Which annotation features to run
   */
  async annotateVideoFromBuffer(
    videoBuffer: Buffer,
    features: ('LABEL' | 'OBJECT' | 'TEXT' | 'SHOT')[] = ['LABEL', 'OBJECT']
  ): Promise<ProcessingResult> {
    await this.initialize();

    if (!this.client) {
      return { success: false, error: 'Video AI client not initialized' };
    }

    // Size limit: 20MB for inline content
    const maxSize = 20 * 1024 * 1024;
    if (videoBuffer.length > maxSize) {
      return { 
        success: false, 
        error: `Video too large for inline processing (${Math.round(videoBuffer.length / 1024 / 1024)}MB > 20MB limit). Use GCS URI instead.` 
      };
    }

    const startTime = Date.now();

    try {
      const featureMap: Record<string, string> = {
        'LABEL': 'LABEL_DETECTION',
        'OBJECT': 'OBJECT_TRACKING',
        'TEXT': 'TEXT_DETECTION',
        'SHOT': 'SHOT_CHANGE_DETECTION',
      };

      const request: IAnnotateVideoRequest = {
        inputContent: videoBuffer.toString('base64'),
        features: features.map(f => featureMap[f] as Feature).filter(Boolean) as Feature[],
      };

      const [operation] = await this.client.annotateVideo(request);
      const [response] = await operation.promise();

      const results = response.annotationResults?.[0];
      
      if (!results) {
        return { success: false, error: 'No annotation results returned' };
      }

      const annotations = this.parseResults(results);
      annotations.processingTimeMs = Date.now() - startTime;

      return { success: true, annotations };
    } catch (error: any) {
      console.error('[VideoAI] Buffer annotation failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Parse API response into clean structure
   */
  private parseResults(results: IVideoAnnotationResults): VideoAnnotations {
    const annotations: VideoAnnotations = {
      labels: [],
      objects: [],
      text: [],
      shots: [],
      processedAt: new Date().toISOString(),
      processingTimeMs: 0,
    };

    // Parse segment labels (video-level and segment-level)
    const segmentLabels = results.segmentLabelAnnotations || [];
    for (const label of segmentLabels) {
      if (!label.entity?.description) continue;

      const segments = (label.segments || []).map(seg => ({
        startTime: this.parseTime(seg.segment?.startTimeOffset),
        endTime: this.parseTime(seg.segment?.endTimeOffset),
      }));

      const maxConfidence = Math.max(
        ...(label.segments || []).map(s => s.confidence || 0)
      );

      annotations.labels.push({
        description: label.entity.description,
        confidence: maxConfidence,
        segments,
      });
    }

    // Parse object tracking
    const objectAnnotations = results.objectAnnotations || [];
    for (const obj of objectAnnotations) {
      if (!obj.entity?.description) continue;

      const frames = (obj.frames || []).map(frame => ({
        time: this.parseTime(frame.timeOffset),
        boundingBox: {
          left: frame.normalizedBoundingBox?.left || 0,
          top: frame.normalizedBoundingBox?.top || 0,
          right: frame.normalizedBoundingBox?.right || 0,
          bottom: frame.normalizedBoundingBox?.bottom || 0,
        },
      }));

      annotations.objects.push({
        description: obj.entity.description,
        confidence: obj.confidence || 0,
        trackId: obj.trackId ? Number(obj.trackId) : 0,
        frames,
      });
    }

    // Parse text detection
    const textAnnotations = results.textAnnotations || [];
    for (const text of textAnnotations) {
      if (!text.text) continue;

      const segments = (text.segments || []).map(seg => ({
        startTime: this.parseTime(seg.segment?.startTimeOffset),
        endTime: this.parseTime(seg.segment?.endTimeOffset),
      }));

      const maxConfidence = Math.max(
        ...(text.segments || []).map(s => s.confidence || 0)
      );

      annotations.text.push({
        text: text.text,
        confidence: maxConfidence,
        segments,
      });
    }

    // Parse shot changes
    const shotAnnotations = results.shotAnnotations || [];
    for (const shot of shotAnnotations) {
      annotations.shots.push({
        startTime: this.parseTime(shot.startTimeOffset),
        endTime: this.parseTime(shot.endTimeOffset),
      });
    }

    return annotations;
  }

  /**
   * Parse Google's Duration proto to seconds
   */
  private parseTime(duration: protos.google.protobuf.IDuration | null | undefined): number {
    if (!duration) return 0;
    const seconds = Number(duration.seconds || 0);
    const nanos = Number(duration.nanos || 0);
    return seconds + nanos / 1e9;
  }

  /**
   * Check if service is properly configured
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      await this.initialize();
      return { healthy: this.initialized && this.client !== null };
    } catch (error: any) {
      return { healthy: false, error: error.message };
    }
  }
}

// Export singleton instance
export const googleVideoAI = new GoogleVideoAIService();


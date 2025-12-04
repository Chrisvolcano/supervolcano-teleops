/**
 * Google Cloud Video Intelligence Service
 * 
 * Handles video annotation using Google Cloud Video Intelligence API.
 * Free tier: 1,000 minutes/month per feature.
 */

import { VideoIntelligenceServiceClient, protos } from '@google-cloud/video-intelligence';

type IVideoAnnotationResults = protos.google.cloud.videointelligence.v1.IVideoAnnotationResults;

export interface VideoAnnotations {
  labels: Array<{
    description: string;
    confidence: number;
    segments: Array<{ startTime: number; endTime: number }>;
  }>;
  objects: Array<{
    description: string;
    confidence: number;
    trackId: number;
    frames: Array<{
      time: number;
      boundingBox: { left: number; top: number; right: number; bottom: number };
    }>;
  }>;
  text: Array<{
    text: string;
    confidence: number;
    segments: Array<{ startTime: number; endTime: number }>;
  }>;
  shots: Array<{ startTime: number; endTime: number }>;
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

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Missing Firebase Admin credentials for Video Intelligence');
      }

      this.client = new VideoIntelligenceServiceClient({
        credentials: { client_email: clientEmail, private_key: privateKey },
        projectId,
      });

      this.initialized = true;
      console.log('[VideoAI] Client initialized with project:', projectId);
    } catch (error: any) {
      console.error('[VideoAI] Failed to initialize:', error.message);
      throw new Error(`Failed to initialize Video AI: ${error.message}`);
    }
  }

  private async downloadVideo(url: string): Promise<Buffer> {
    console.log(`[VideoAI] Downloading video...`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`[VideoAI] Downloaded ${Math.round(buffer.length / 1024 / 1024 * 10) / 10}MB`);
    return buffer;
  }

  async annotateVideo(
    videoUrl: string,
    features: ('LABEL' | 'OBJECT' | 'TEXT' | 'SHOT')[] = ['LABEL', 'OBJECT', 'TEXT']
  ): Promise<ProcessingResult> {
    await this.initialize();

    if (!this.client) {
      return { success: false, error: 'Video AI client not initialized' };
    }

    const startTime = Date.now();

    try {
      // Download video from Firebase Storage URL
      const videoBuffer = await this.downloadVideo(videoUrl);
      
      // Check 20MB limit
      const maxSize = 20 * 1024 * 1024;
      if (videoBuffer.length > maxSize) {
        return { 
          success: false, 
          error: `Video too large (${Math.round(videoBuffer.length / 1024 / 1024)}MB). Max 20MB.` 
        };
      }

      const featureMap: Record<string, number> = {
        'LABEL': 1, 'OBJECT': 9, 'TEXT': 7, 'SHOT': 4,
      };

      const requestFeatures = features
        .map(f => featureMap[f])
        .filter((f): f is number => f !== undefined);

      console.log(`[VideoAI] Starting annotation with features: ${features.join(', ')}`);

      const [operation] = await this.client.annotateVideo({
        inputContent: videoBuffer.toString('base64'),
        features: requestFeatures,
      });

      console.log('[VideoAI] Waiting for annotation (this may take 1-3 minutes)...');
      const [response] = await operation.promise();

      const results = response.annotationResults?.[0];
      if (!results) {
        return { success: false, error: 'No annotation results returned' };
      }

      const annotations = this.parseResults(results);
      annotations.processingTimeMs = Date.now() - startTime;

      console.log(`[VideoAI] Complete in ${Math.round(annotations.processingTimeMs / 1000)}s`);
      console.log(`[VideoAI] Found: ${annotations.labels.length} labels, ${annotations.objects.length} objects`);

      return { success: true, annotations };
    } catch (error: any) {
      console.error('[VideoAI] Annotation failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async annotateVideoFromBuffer(
    videoBuffer: Buffer,
    features: ('LABEL' | 'OBJECT' | 'TEXT' | 'SHOT')[] = ['LABEL', 'OBJECT']
  ): Promise<ProcessingResult> {
    await this.initialize();
    if (!this.client) return { success: false, error: 'Client not initialized' };

    const maxSize = 20 * 1024 * 1024;
    if (videoBuffer.length > maxSize) {
      return { success: false, error: `Video too large (${Math.round(videoBuffer.length / 1024 / 1024)}MB > 20MB)` };
    }

    const startTime = Date.now();
    try {
      const featureMap: Record<string, number> = { 'LABEL': 1, 'OBJECT': 9, 'TEXT': 7, 'SHOT': 4 };
      const requestFeatures = features.map(f => featureMap[f]).filter((f): f is number => f !== undefined);

      const [operation] = await this.client.annotateVideo({
        inputContent: videoBuffer.toString('base64'),
        features: requestFeatures,
      });
      const [response] = await operation.promise();

      const results = response.annotationResults?.[0];
      if (!results) return { success: false, error: 'No results' };

      const annotations = this.parseResults(results);
      annotations.processingTimeMs = Date.now() - startTime;
      return { success: true, annotations };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private parseResults(results: IVideoAnnotationResults): VideoAnnotations {
    const annotations: VideoAnnotations = {
      labels: [], objects: [], text: [], shots: [],
      processedAt: new Date().toISOString(),
      processingTimeMs: 0,
    };

    for (const label of results.segmentLabelAnnotations || []) {
      if (!label.entity?.description) continue;
      const segments = (label.segments || []).map(seg => ({
        startTime: this.parseTime(seg.segment?.startTimeOffset),
        endTime: this.parseTime(seg.segment?.endTimeOffset),
      }));
      const maxConf = Math.max(...(label.segments || []).map(s => s.confidence || 0), 0);
      annotations.labels.push({ description: label.entity.description, confidence: maxConf, segments });
    }

    for (const obj of results.objectAnnotations || []) {
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

    for (const text of results.textAnnotations || []) {
      if (!text.text) continue;
      const segments = (text.segments || []).map(seg => ({
        startTime: this.parseTime(seg.segment?.startTimeOffset),
        endTime: this.parseTime(seg.segment?.endTimeOffset),
      }));
      const maxConf = Math.max(...(text.segments || []).map(s => s.confidence || 0), 0);
      annotations.text.push({ text: text.text, confidence: maxConf, segments });
    }

    for (const shot of results.shotAnnotations || []) {
      annotations.shots.push({
        startTime: this.parseTime(shot.startTimeOffset),
        endTime: this.parseTime(shot.endTimeOffset),
      });
    }

    return annotations;
  }

  private parseTime(duration: protos.google.protobuf.IDuration | null | undefined): number {
    if (!duration) return 0;
    return Number(duration.seconds || 0) + Number(duration.nanos || 0) / 1e9;
  }

  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      await this.initialize();
      return { healthy: this.initialized && this.client !== null };
    } catch (error: any) {
      return { healthy: false, error: error.message };
    }
  }
}

export const googleVideoAI = new GoogleVideoAIService();

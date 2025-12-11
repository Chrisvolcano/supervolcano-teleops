import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { VideoIntelligenceServiceClient } from '@google-cloud/video-intelligence';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min timeout for video processing

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const db = getAdminDb();
    const docRef = db.collection('media').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }
    
    const data = doc.data();
    const videoUrl = data?.url || data?.storageUrl || data?.videoUrl;
    
    if (!videoUrl) {
      return NextResponse.json({ error: 'No video URL' }, { status: 400 });
    }

    // Update status to processing
    await docRef.update({ 
      faceDetectionStatus: 'processing',
      updatedAt: new Date()
    });

    // Initialize Video Intelligence client
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing Firebase Admin credentials for Video Intelligence');
    }

    const client = new VideoIntelligenceServiceClient({
      credentials: { client_email: clientEmail, private_key: privateKey },
      projectId,
    });
    
    // Convert Firebase Storage URL to GCS URI if needed
    let inputUri = videoUrl;
    if (videoUrl.includes('firebasestorage.googleapis.com')) {
      // Extract bucket and path from Firebase Storage URL
      const urlMatch = videoUrl.match(/\/o\/(.+)\?/);
      if (urlMatch) {
        const path = decodeURIComponent(urlMatch[1]);
        const bucket = videoUrl.match(/\/v0\/b\/([^/]+)\//)?.[1];
        if (bucket) {
          inputUri = `gs://${bucket}/${path}`;
        }
      }
    }
    
    const [operation] = await client.annotateVideo({
      inputUri: inputUri,
      features: ['FACE_DETECTION'],
    });

    const [result] = await operation.promise();
    
    const faceAnnotations = result.annotationResults?.[0]?.faceDetectionAnnotations || [];
    const hasFaces = faceAnnotations.length > 0;
    const faceCount = faceAnnotations.length;
    
    // Extract face timestamps if faces found
    const faceTimestamps = faceAnnotations.map(face => {
      const tracks = face.tracks || [];
      if (tracks.length > 0) {
        const segment = tracks[0].segment;
        const startSeconds = segment?.startTimeOffset?.seconds 
          ? parseFloat(segment.startTimeOffset.seconds.toString())
          : 0;
        const endSeconds = segment?.endTimeOffset?.seconds
          ? parseFloat(segment.endTimeOffset.seconds.toString())
          : 0;
        return {
          startTime: startSeconds,
          endTime: endSeconds,
        };
      }
      return null;
    }).filter((ts): ts is { startTime: number; endTime: number } => ts !== null);

    // Update Firestore with results
    await docRef.update({
      faceDetectionStatus: 'completed',
      hasFaces,
      faceCount,
      faceTimestamps: faceTimestamps.length > 0 ? faceTimestamps : null,
      faceDetectedAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ 
      success: true, 
      hasFaces, 
      faceCount 
    });

  } catch (error: any) {
    console.error('Face detection error:', error);
    
    // Update status to failed
    try {
      const db = getAdminDb();
      await db.collection('media').doc(params.id).update({
        faceDetectionStatus: 'failed',
        faceDetectionError: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date(),
      });
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }
    
    return NextResponse.json({ 
      error: 'Face detection failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


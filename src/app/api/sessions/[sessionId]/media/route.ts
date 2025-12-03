/**
 * SESSION MEDIA API
 * Receives GoPro video segments from mobile app
 * 
 * Handles segmented recordings from GoPro cameras during cleaning sessions
 * Each segment is 5 minutes, uploaded automatically while recording continues
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth, adminStorage } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { getDownloadURL } from 'firebase-admin/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds for large file uploads

interface MediaSegmentPayload {
  segmentId: string;
  segmentNumber: number;
  filename: string;
  data: string; // Base64 encoded video data
  locationId: string;
  startedAt: string;
  endedAt?: string;
}

/**
 * POST /api/sessions/[sessionId]/media
 * Upload a GoPro video segment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId;
    
    // Authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (err) {
      console.error('[SessionMedia] Token verification failed:', err);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const userId = decodedToken.uid;
    
    // Verify session exists and user has access
    const sessionDoc = await adminDb.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    const sessionData = sessionDoc.data();
    if (sessionData?.operatorId !== userId && decodedToken.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Parse request body
    const body: MediaSegmentPayload = await request.json();
    const {
      segmentId,
      segmentNumber,
      filename,
      data,
      locationId,
      startedAt,
      endedAt,
    } = body;
    
    if (!segmentId || !filename || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: segmentId, filename, data' },
        { status: 400 }
      );
    }
    
    console.log(`[SessionMedia] Uploading segment ${segmentNumber} for session ${sessionId}`);
    
    // Convert base64 to buffer
    const base64Data = data.includes('base64,') 
      ? data.split('base64,')[1] 
      : data;
    const videoBuffer = Buffer.from(base64Data, 'base64');
    
    // Upload to Firebase Storage
    const storagePath = `sessions/${sessionId}/segments/${segmentId}/${filename}`;
    const bucket = adminStorage.bucket();
    const file = bucket.file(storagePath);
    
    await file.save(videoBuffer, {
      metadata: {
        contentType: filename.endsWith('.LRV') 
          ? 'video/x-msvideo' 
          : 'video/mp4',
        metadata: {
          sessionId,
          segmentId,
          segmentNumber: segmentNumber.toString(),
          locationId,
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
        },
      },
    });
    
    // Make file publicly readable (or configure access based on your needs)
    await file.makePublic();
    
    // Get download URL
    const downloadUrl = await getDownloadURL(file);
    
    // Calculate duration
    const startTime = new Date(startedAt);
    const endTime = endedAt ? new Date(endedAt) : new Date();
    const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
    
    // Create segment record in Firestore
    const segmentRef = adminDb
      .collection('sessions')
      .doc(sessionId)
      .collection('segments')
      .doc(segmentId);
    
    await segmentRef.set({
      segmentId,
      segmentNumber,
      filename,
      storagePath,
      downloadUrl,
      locationId,
      startedAt: new Date(startedAt),
      endedAt: endedAt ? new Date(endedAt) : FieldValue.serverTimestamp(),
      durationSeconds,
      uploadedAt: FieldValue.serverTimestamp(),
      uploadedBy: userId,
      sizeBytes: videoBuffer.length,
      isLowRes: filename.endsWith('.LRV'),
    });
    
    // Update session metadata
    await adminDb.collection('sessions').doc(sessionId).update({
      segmentCount: FieldValue.increment(1),
      hasMedia: true,
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    console.log(`[SessionMedia] Segment ${segmentNumber} uploaded successfully`);
    
    return NextResponse.json({
      success: true,
      segment: {
        id: segmentId,
        segmentNumber,
        downloadUrl,
        durationSeconds,
      },
    });
    
  } catch (error: any) {
    console.error('[SessionMedia] Error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to upload segment',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sessions/[sessionId]/media
 * Get all segments for a session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId;
    
    // Authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Verify session access
    const sessionDoc = await adminDb.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    const sessionData = sessionDoc.data();
    if (sessionData?.operatorId !== decodedToken.uid && decodedToken.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Fetch all segments
    const segmentsSnap = await adminDb
      .collection('sessions')
      .doc(sessionId)
      .collection('segments')
      .orderBy('segmentNumber', 'asc')
      .get();
    
    const segments = segmentsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        segmentNumber: data.segmentNumber,
        filename: data.filename,
        downloadUrl: data.downloadUrl,
        startedAt: data.startedAt?.toDate?.()?.toISOString() || data.startedAt,
        endedAt: data.endedAt?.toDate?.()?.toISOString() || data.endedAt,
        durationSeconds: data.durationSeconds,
        sizeBytes: data.sizeBytes,
        isLowRes: data.isLowRes || false,
      };
    });
    
    return NextResponse.json({
      success: true,
      segments,
      count: segments.length,
    });
    
  } catch (error: any) {
    console.error('[SessionMedia] GET Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch segments' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_DRIVE_CLIENT_ID,
  process.env.GOOGLE_DRIVE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_URL || 'https://supervolcano-teleops.vercel.app'}/api/admin/drive/callback`
);

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const claims = await getUserClaims(token);
    if (!claims) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    requireRole(claims, ['superadmin', 'admin']);

    // Get user ID from token
    const { adminAuth } = await import('@/lib/firebaseAdmin');
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const db = getAdminDb();
    const doc = await db.collection('userDriveTokens').doc(userId).get();
    
    if (!doc.exists) {
      return NextResponse.json({ authenticated: false });
    }

    const data = doc.data()!;
    
    // Check if token is expired
    const expiresAt = data.expiresAt?.toMillis ? data.expiresAt.toMillis() : (data.expiresAt as number | null);
    if (expiresAt && expiresAt < Date.now()) {
      // Try to refresh
      if (data.refreshToken) {
        oauth2Client.setCredentials({ refresh_token: data.refreshToken });
        const { credentials } = await oauth2Client.refreshAccessToken();
        
        await doc.ref.update({
          accessToken: credentials.access_token,
          expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
          updatedAt: new Date(),
        });
        
        return NextResponse.json({ 
          authenticated: true, 
          accessToken: credentials.access_token 
        });
      }
      
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({ 
      authenticated: true, 
      accessToken: data.accessToken 
    });
  } catch (error: any) {
    console.error('[drive/check-auth] Error:', error);
    return NextResponse.json({ authenticated: false });
  }
}


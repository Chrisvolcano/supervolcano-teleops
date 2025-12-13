import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_DRIVE_CLIENT_ID,
  process.env.GOOGLE_DRIVE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_URL || 'https://supervolcano-teleops.vercel.app'}/api/admin/drive/callback`
);

const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
];

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

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
      state: userId, // Pass user ID for callback
    });

    return NextResponse.json({ authUrl });
  } catch (error: any) {
    console.error('[drive/auth] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const claims = await getUserClaims(token);

    if (!claims || !['admin', 'superadmin', 'partner_admin'].includes(claims.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Authorization code required' }, { status: 400 });
    }

    const { tokens } = await oauth2Client.getToken(code);
    
    return NextResponse.json({ 
      success: true,
      accessToken: tokens.access_token,
      expiresAt: tokens.expiry_date,
    });
  } catch (error: any) {
    console.error('[Drive Auth] Token exchange error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


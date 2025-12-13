import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAdminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_DRIVE_CLIENT_ID,
  process.env.GOOGLE_DRIVE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_URL || 'https://supervolcano-teleops.vercel.app'}/api/admin/drive/callback`
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // User ID
  const error = searchParams.get('error');

  if (error) {
    return new NextResponse(
      `<html><body><script>
        window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: '${error}' }, '*');
        window.close();
      </script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  if (!code || !state) {
    return new NextResponse(
      `<html><body><script>
        window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: 'Missing code or state' }, '*');
        window.close();
      </script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    // Store tokens in Firestore for this user
    const db = getAdminDb();
    await db.collection('userDriveTokens').doc(state).set({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date,
      updatedAt: new Date(),
    }, { merge: true });

    return new NextResponse(
      `<html><body><script>
        window.opener.postMessage({ 
          type: 'GOOGLE_AUTH_SUCCESS', 
          accessToken: '${tokens.access_token}' 
        }, '*');
        window.close();
      </script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (err: any) {
    console.error('[drive/callback] Error:', err);
    return new NextResponse(
      `<html><body><script>
        window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: '${err.message}' }, '*');
        window.close();
      </script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}


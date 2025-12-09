'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function CallbackContent() {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    
    if (window.opener) {
      if (code) {
        window.opener.postMessage({ type: 'google-oauth-callback', code }, '*');
      } else if (error) {
        window.opener.postMessage({ type: 'google-oauth-error', error }, '*');
      }
      window.close();
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">Connecting to Google Drive...</p>
      </div>
    </div>
  );
}

export default function GoogleDriveCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}


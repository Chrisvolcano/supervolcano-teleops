'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';
import { CheckCircle, Download, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function CompletePage() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/get-started/auth');
        return;
      }

      // Mark onboarding complete
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          onboardingComplete: true,
        });
      } catch (error) {
        console.error('Failed to update onboarding status:', error);
      }

      // Clear session storage
      sessionStorage.removeItem('onboarding_location_id');
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="flex-1 flex flex-col px-6 py-8 items-center justify-center text-center">
      {/* Success icon */}
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re all set!</h1>
      <p className="text-gray-600 mb-8 max-w-sm">
        Your property is ready. Download the app to manage your cleaning schedule and communicate with cleaners.
      </p>

      {/* App download */}
      <div className="w-full space-y-3 mb-8">
        <a
          href="https://apps.apple.com/app/supervolcano-camera/id6755791636"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 w-full py-4 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition"
        >
          <Download className="w-5 h-5" />
          Download iOS App
        </a>

        <Link
          href="/properties"
          className="flex items-center justify-center gap-2 w-full py-4 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
        >
          Continue to Web Dashboard
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>

      {/* What's next */}
      <div className="w-full bg-gray-50 rounded-xl p-4 text-left">
        <div className="font-medium text-gray-900 mb-3">What happens next?</div>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-blue-600">1.</span>
            Your cleaners will receive invite emails
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">2.</span>
            They&apos;ll download the app and join your property
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">3.</span>
            Our AI analyzes your videos to create cleaning guides
          </li>
        </ul>
      </div>
    </div>
  );
}


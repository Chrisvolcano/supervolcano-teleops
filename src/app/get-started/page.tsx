'use client';

import { useRouter } from 'next/navigation';
import { Home, Video, Users, CheckCircle } from 'lucide-react';

export default function GetStartedPage() {
  const router = useRouter();

  const steps = [
    { icon: Home, title: 'Add your property', desc: 'Enter address and details' },
    { icon: Video, title: 'Upload walkthrough', desc: 'Show how you want it cleaned' },
    { icon: Users, title: 'Invite cleaners', desc: 'Add your cleaning team' },
    { icon: CheckCircle, title: "You're set!", desc: 'Manage everything from the app' },
  ];

  return (
    <div className="flex-1 flex flex-col px-6 py-8">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Get your property set up in 5 minutes
        </h1>
        <p className="text-gray-600">
          No app download required. Just your phone camera.
        </p>
      </div>

      {/* Steps preview */}
      <div className="space-y-4 mb-8">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-4 p-4 bg-white rounded-lg border">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <step.icon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">{step.title}</div>
              <div className="text-sm text-gray-500">{step.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-auto space-y-3">
        <button
          onClick={() => router.push('/get-started/auth')}
          className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition"
        >
          Get Started
        </button>
        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <button onClick={() => router.push('/get-started/auth?mode=signin')} className="text-blue-600">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}


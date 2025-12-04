'use client';

import { useState, createContext } from 'react';
import Link from 'next/link';

interface OnboardingContextType {
  step: number;
  totalSteps: number;
  propertyData: any;
  setPropertyData: (data: any) => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export default function GetStartedLayout({ children }: { children: React.ReactNode }) {
  const [propertyData, setPropertyData] = useState({});

  return (
    <OnboardingContext.Provider value={{ step: 1, totalSteps: 5, propertyData, setPropertyData }}>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-blue-600">
            SuperVolcano
          </Link>
          <span className="text-sm text-gray-500">Property Setup</span>
        </header>

        {/* Content */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </div>
    </OnboardingContext.Provider>
  );
}


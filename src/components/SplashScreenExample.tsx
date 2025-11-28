/**
 * Example: How to integrate SplashScreen properly to prevent app closing bug
 * 
 * Copy this pattern into your dashboard or main page component
 */

'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import SplashScreen from './SplashScreen';

export default function SplashScreenExample() {
  const [showSplash, setShowSplash] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    console.log('Component mounted, showSplash:', showSplash);
    
    return () => {
      console.log('Component unmounting!'); // If you see this, something is causing unmount
    };
  }, [showSplash]);

  // Prevent app from closing by properly managing state
  const handleSplashComplete = () => {
    console.log('handleSplashComplete called');
    setShowSplash(false);
    setIsReady(true);
  };

  console.log('Render - showSplash:', showSplash, 'isReady:', isReady);

  // Show splash screen
  if (showSplash) {
    console.log('Rendering splash screen');
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // Show main content only after splash is complete
  console.log('Rendering main content');
  
  return (
    <AnimatePresence mode="wait">
      <div className="min-h-screen bg-white">
        <h1>Dashboard Loaded Successfully</h1>
        <p>App did not close - splash screen completed properly!</p>
      </div>
    </AnimatePresence>
  );
}




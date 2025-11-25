'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    console.log('SplashScreen mounted');
    
    // Wait for animation to complete before starting exit
    const exitTimer = setTimeout(() => {
      console.log('SplashScreen: Starting exit animation');
      setIsExiting(true);
    }, 3000); // Show for 3 seconds

    // Call onComplete after fade out animation
    const completeTimer = setTimeout(() => {
      console.log('SplashScreen: Calling onComplete');
      onComplete();
    }, 3500); // 3s display + 0.5s fade out

    return () => {
      console.log('SplashScreen: Cleaning up timers');
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-white"
    >
      {/* VOLCANO text with left-to-right gradient reveal */}
      <div className="relative overflow-hidden">
        <motion.h1
          className="relative text-8xl font-black tracking-tight md:text-9xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {/* Background text (grey) */}
          <span className="absolute inset-0 bg-gradient-to-r from-neutral-300 to-neutral-400 bg-clip-text text-transparent">
            VOLCANO
          </span>
          
          {/* Foreground text (black) with left-to-right reveal */}
          <motion.span
            className="relative bg-gradient-to-r from-black via-neutral-800 to-neutral-900 bg-clip-text text-transparent"
            initial={{ clipPath: 'inset(0 100% 0 0)' }}
            animate={{ clipPath: 'inset(0 0% 0 0)' }}
            transition={{
              duration: 1.5,
              delay: 0.5,
              ease: [0.22, 1, 0.36, 1] // Custom easing for smooth reveal
            }}
          >
            VOLCANO
          </motion.span>
        </motion.h1>

        {/* Subtle loading indicator */}
        <motion.div
          className="mt-8 flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
        >
          <div className="h-0.5 w-48 overflow-hidden rounded-full bg-neutral-200">
            <motion.div
              className="h-full bg-gradient-to-r from-neutral-800 to-black"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{
                duration: 1.2,
                repeat: 1,
                ease: "easeInOut"
              }}
            />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

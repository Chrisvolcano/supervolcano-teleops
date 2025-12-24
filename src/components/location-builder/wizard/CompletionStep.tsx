/**
 * COMPLETION STEP
 * Celebrates successful setup and guides to next actions
 */

'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle, Eye, Users, Video, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompletionStepProps {
  locationName: string;
  stats: {
    floors: number;
    rooms: number;
    targets: number;
    actions: number;
    estimatedMinutes: number;
  };
  onViewStructure: () => void;
  onAssignCleaners: () => void;
  onAddMedia: () => void;
}

export function CompletionStep({
  locationName,
  stats,
  onViewStructure,
  onAssignCleaners,
  onAddMedia,
}: CompletionStepProps) {
  const [showContent, setShowContent] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // Staggered animation
  useEffect(() => {
    const timer1 = setTimeout(() => setShowContent(true), 300);
    const timer2 = setTimeout(() => setShowActions(true), 800);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="text-center py-8">
      {/* Success icon with animation */}
      <div 
        className={cn(
          "transition-all duration-500 transform",
          showContent ? "opacity-100 scale-100" : "opacity-0 scale-75"
        )}
      >
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20" />
          <div className="relative w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-500" />
        </div>
      </div>

      {/* Success message */}
      <div 
        className={cn(
          "mt-6 transition-all duration-500 delay-100",
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Location Setup Complete!
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          {locationName} is ready to go
        </p>
      </div>

      {/* Stats summary */}
      <div 
        className={cn(
          "mt-8 grid grid-cols-4 gap-4 transition-all duration-500 delay-200",
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        <div className="bg-orange-500/10 dark:bg-orange-500/10 rounded-xl p-4">
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.floors}</p>
          <p className="text-xs text-orange-600/70 dark:text-orange-400/70">floor{stats.floors !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-500/10 rounded-xl p-4">
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.rooms}</p>
          <p className="text-xs text-purple-600/70 dark:text-purple-400/70">room{stats.rooms !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-500/10 rounded-xl p-4">
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.targets}</p>
          <p className="text-xs text-orange-600/70 dark:text-orange-400/70">target{stats.targets !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-500/10 rounded-xl p-4">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">~{stats.estimatedMinutes}</p>
          <p className="text-xs text-green-600/70 dark:text-green-400/70">min total</p>
        </div>
      </div>

      {/* What's next section */}
      <div 
        className={cn(
          "mt-10 transition-all duration-500",
          showActions ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">What would you like to do next?</p>
        
        <div className="space-y-3 max-w-sm mx-auto">
          {/* Primary action - View Structure */}
          <button
            onClick={onViewStructure}
            className="w-full flex items-center justify-between p-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5" />
              <span className="font-medium">View Structure</span>
            </div>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Secondary action - Assign Cleaners */}
          <button
            onClick={onAssignCleaners}
            className="w-full flex items-center justify-between p-4 bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#2a2a2a] text-gray-700 dark:text-gray-300 rounded-xl hover:border-gray-300 dark:hover:border-[#3a3a3a] hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="font-medium">Assign Cleaners</span>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Tertiary action - Add Training Videos */}
          <button
            onClick={onAddMedia}
            className="w-full flex items-center justify-between p-4 bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#2a2a2a] text-gray-700 dark:text-gray-300 rounded-xl hover:border-gray-300 dark:hover:border-[#3a3a3a] hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Video className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="font-medium">Add Training Videos</span>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}


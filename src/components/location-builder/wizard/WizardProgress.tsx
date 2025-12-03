/**
 * WIZARD PROGRESS INDICATOR
 * Shows current step in the wizard flow
 */

import React from 'react';
import { WizardStep } from '@/hooks/useLocationWizard';
import { Building2, LayoutGrid, Target, Key, Package, Heart, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardProgressProps {
  currentStep: WizardStep;
}

const STEPS: { key: WizardStep; label: string; icon: React.ElementType }[] = [
  { key: 'floors', label: 'Floors', icon: Building2 },
  { key: 'rooms', label: 'Rooms', icon: LayoutGrid },
  { key: 'targets', label: 'Targets', icon: Target },
  { key: 'access', label: 'Access', icon: Key },
  { key: 'storage', label: 'Storage', icon: Package },
  { key: 'preferences', label: 'Preferences', icon: Heart },
  { key: 'review', label: 'Review', icon: CheckCircle },
];

export function WizardProgress({ currentStep }: WizardProgressProps) {
  // Hide progress bar on completion
  if (currentStep === 'completion') {
    return null;
  }

  const currentIndex = STEPS.findIndex(s => s.key === currentStep);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isUpcoming = index > currentIndex;

          return (
            <React.Fragment key={step.key}>
              {/* Step */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                    isComplete && 'bg-green-500 text-white',
                    isCurrent && 'bg-blue-600 text-white',
                    isUpcoming && 'bg-gray-200 text-gray-400'
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium',
                    isCurrent ? 'text-blue-600' : 'text-gray-500'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2',
                    index < currentIndex ? 'bg-green-500' : 'bg-gray-200'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}


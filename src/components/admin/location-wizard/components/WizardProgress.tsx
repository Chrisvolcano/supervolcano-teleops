/**
 * WIZARD PROGRESS INDICATOR
 * Visual progress indicator for wizard steps
 * Last updated: 2025-11-26
 */

import { MapPin, Building2, CheckCircle } from 'lucide-react';

interface WizardProgressProps {
  currentStep: number;
}

export default function WizardProgress({ currentStep }: WizardProgressProps) {
  const steps = [
    { number: 1, title: 'Basic Info', icon: MapPin },
    { number: 2, title: 'Build Structure', icon: Building2 },
    { number: 3, title: 'Review', icon: CheckCircle },
  ];

  return (
    <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center justify-center gap-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep >= step.number;
          const isCurrent = currentStep === step.number;

          return (
            <div key={step.number} className="flex items-center">
              {/* Step */}
              <div className="flex items-center gap-3">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-colors
                    ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}
                    ${isCurrent ? 'ring-4 ring-blue-100' : ''}
                  `}
                >
                  <Icon size={20} />
                </div>
                <span
                  className={`
                    text-sm font-medium hidden sm:inline
                    ${isActive ? 'text-gray-900' : 'text-gray-400'}
                  `}
                >
                  {step.title}
                </span>
              </div>

              {/* Connector */}
              {index < steps.length - 1 && (
                <div
                  className={`
                    w-16 h-1 mx-3 transition-colors
                    ${currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200'}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


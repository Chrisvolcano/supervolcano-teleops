/**
 * CREATE LOCATION WIZARD - MAIN ORCHESTRATOR
 * Production-ready with error handling, loading states, and accessibility
 * Last updated: 2025-11-26
 */

'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useLocationBuilder } from '@/hooks/useLocationBuilder';
import WizardProgress from './components/WizardProgress';
import Step1BasicInfo from './steps/Step1BasicInfo';
import Step2BuildStructure from './steps/Step2BuildStructure';
import Step3Review from './steps/Step3Review';

interface CreateLocationWizardProps {
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateLocationWizard({ 
  organizationId,
  onClose, 
  onSuccess 
}: CreateLocationWizardProps) {
  const {
    name,
    address,
    floors,
    currentStep,
    isSubmitting,
    errors,
    stats,
    setName,
    setAddress,
    addFloor,
    updateFloorName,
    deleteFloor,
    addRoom,
    updateRoom,
    deleteRoom,
    addTarget,
    updateTarget,
    deleteTarget,
    goToNextStep,
    goToPreviousStep,
    submitLocation,
  } = useLocationBuilder();

  // Warn user before closing if they have data
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (name || address || floors.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [name, address, floors.length]);

  const handleClose = () => {
    if (name || address || floors.length > 0) {
      if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
        return;
      }
    }
    onClose();
  };

  const handleSubmit = async () => {
    const success = await submitLocation(organizationId);
    if (success) {
      onSuccess();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-labelledby="wizard-title"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 id="wizard-title" className="text-xl font-semibold">
            Create New Location
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="Close wizard"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Indicator */}
        <WizardProgress currentStep={currentStep} />

        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <ul className="space-y-1">
              {errors.map((error, index) => (
                <li key={index} className="text-sm text-red-800 flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">•</span>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {currentStep === 1 && (
            <Step1BasicInfo
              name={name}
              setName={setName}
              address={address}
              setAddress={setAddress}
            />
          )}

          {currentStep === 2 && (
            <Step2BuildStructure
              floors={floors}
              addFloor={addFloor}
              updateFloorName={updateFloorName}
              deleteFloor={deleteFloor}
              addRoom={addRoom}
              updateRoom={updateRoom}
              deleteRoom={deleteRoom}
              addTarget={addTarget}
              updateTarget={updateTarget}
              deleteTarget={deleteTarget}
            />
          )}

          {currentStep === 3 && (
            <Step3Review
              name={name}
              address={address}
              stats={stats}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <button
            onClick={currentStep === 1 ? handleClose : goToPreviousStep}
            disabled={isSubmitting}
            className="px-5 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </button>

          <div className="text-sm text-gray-500 font-medium">
            Step {currentStep} of 3
          </div>

          {currentStep < 3 ? (
            <button
              onClick={goToNextStep}
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Location'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


/**
 * LOCATION BUILDER WIZARD
 * Guided setup flow for new locations
 */

'use client';

import React from 'react';
import { useLocationWizard, WizardStep } from '@/hooks/useLocationWizard';
import { FloorStep } from './wizard/FloorStep';
import { RoomStep } from './wizard/RoomStep';
import { TargetStep } from './wizard/TargetStep';
import { ReviewStep } from './wizard/ReviewStep';
import { CompletionStep } from './wizard/CompletionStep';
import { WizardProgress } from './wizard/WizardProgress';
import { Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface LocationWizardProps {
  locationId: string;
  locationName: string;
  locationAddress: string;
  onComplete: () => void;
  onGoToAssignments?: () => void;
  onGoToMedia?: () => void;
  onSwitchToManual: () => void;
}

export function LocationWizard({
  locationId,
  locationName,
  locationAddress,
  onComplete,
  onGoToAssignments,
  onGoToMedia,
  onSwitchToManual,
}: LocationWizardProps) {
  const { getIdToken } = useAuth();
  
  const wizard = useLocationWizard({
    locationId,
    onSave: async (data) => {
      // Save to Firestore
      const token = await getIdToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`/api/admin/locations/${locationId}/structure`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save');
      }
    },
  });

  const { state, getStats } = wizard;
  const stats = getStats();

  const renderStep = () => {
    switch (state.currentStep) {
      case 'floors':
        return <FloorStep wizard={wizard} />;
      case 'rooms':
        return <RoomStep wizard={wizard} />;
      case 'targets':
        return <TargetStep wizard={wizard} />;
      case 'review':
        return <ReviewStep wizard={wizard} onComplete={() => wizard.goToStep('completion')} />;
      case 'completion':
        return (
          <CompletionStep
            locationName={locationName}
            stats={stats}
            onViewStructure={onComplete}
            onAssignCleaners={onGoToAssignments || onComplete}
            onAddMedia={onGoToMedia || onComplete}
          />
        );
      default:
        return <FloorStep wizard={wizard} />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{locationName}</h1>
        <p className="text-gray-500">{locationAddress}</p>
      </div>

      {/* Progress indicator */}
      <WizardProgress currentStep={state.currentStep} />

      {/* Auto-save indicator */}
      <div className="flex items-center justify-end mb-4 text-sm">
        {state.isSaving ? (
          <span className="flex items-center text-gray-500">
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            Saving...
          </span>
        ) : state.lastSaved ? (
          <span className="flex items-center text-green-600">
            <Check className="w-4 h-4 mr-1" />
            Saved
          </span>
        ) : null}
      </div>

      {/* Step content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {renderStep()}
      </div>

      {/* Stats summary - hide on completion */}
      {state.currentStep !== 'completion' && stats.floors > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between text-sm text-gray-600">
            <span>{stats.floors} floor{stats.floors !== 1 ? 's' : ''}</span>
            <span>{stats.rooms} room{stats.rooms !== 1 ? 's' : ''}</span>
            <span>{stats.targets} target{stats.targets !== 1 ? 's' : ''}</span>
            <span>{stats.actions} action{stats.actions !== 1 ? 's' : ''}</span>
            <span>~{stats.estimatedMinutes} min total</span>
          </div>
        </div>
      )}

      {/* Manual mode escape - hide on completion */}
      {state.currentStep !== 'completion' && (
        <div className="mt-6 text-center">
          <button
            onClick={onSwitchToManual}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Skip setup, build manually →
          </button>
        </div>
      )}
    </div>
  );
}


/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Building2, ListTodo, Settings, Loader2, Users, Film } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import LocationStructureTab from '@/components/admin/LocationStructureTab';
import LocationTasksTab from '@/components/admin/LocationTasksTab';
import LocationAssignmentsTab from '@/components/admin/LocationAssignmentsTab';
import LocationMediaTab from '@/components/locations/LocationMediaTab';
import LocationReferenceMedia from '@/components/admin/LocationReferenceMedia';
import { LocationWizard } from '@/components/location-builder/LocationWizard';
import type { ReferenceMediaItem } from '@/types/location-intelligence';

type Tab = 'structure' | 'assignments' | 'tasks' | 'media' | 'settings';

export default function AdminLocationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { getIdToken } = useAuth();
  const locationId = params.id as string;

  const [location, setLocation] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('structure');
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardCompleted, setWizardCompleted] = useState(false);
  const [structureChecked, setStructureChecked] = useState(false);

  const loadLocation = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) return;

      const response = await fetch(`/api/admin/locations/${locationId}/firestore`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (data.success) {
        setLocation(data.location);
      }
    } catch (error) {
      console.error('Failed to load location:', error);
    } finally {
      setLoading(false);
    }
  }, [locationId, getIdToken]);

  useEffect(() => {
    if (locationId) {
      loadLocation();
    }
  }, [loadLocation, locationId]);

  // Check structure exists before deciding to show wizard
  useEffect(() => {
    const checkStructure = async () => {
      if (!location?.id) return;

      try {
        const token = await getIdToken();
        if (!token) return;

        const response = await fetch(`/api/admin/locations/${location.id}/structure`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        console.log('[StructureCheck] hasStructure:', data.hasStructure);

        // Only show wizard if structure is actually empty
        if (!data.hasStructure && !wizardCompleted) {
          setShowWizard(true);
        }
        setStructureChecked(true);
      } catch (error) {
        console.error('[StructureCheck] Error:', error);
        setStructureChecked(true);
      }
    };

    checkStructure();
  }, [location?.id, wizardCompleted, getIdToken]);

  if (loading || !structureChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-500">Loading location...</p>
        </div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Location not found</p>
          <button
            onClick={() => router.push('/admin/locations')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Locations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/locations')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{location.name}</h1>
                <p className="text-sm text-gray-600 mt-1">{location.address || 'No address'}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('structure')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'structure'
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="h-4 w-4" />
              Structure
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'assignments'
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="h-4 w-4" />
              Assignments
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'tasks'
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <ListTodo className="h-4 w-4" />
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'media'
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Film className="h-4 w-4" />
              Media
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'structure' && showWizard ? (
          <LocationWizard
            locationId={locationId}
            locationName={location.name}
            locationAddress={location.address || 'No address'}
            onComplete={() => {
              console.log('[LocationPage] Wizard complete');
              setWizardCompleted(true);
              setShowWizard(false);
              setActiveTab('structure');
              loadLocation(); // Reload to show new structure
            }}
            onGoToAssignments={() => {
              setWizardCompleted(true);
              setShowWizard(false);
              setActiveTab('assignments');
              loadLocation(); // Reload to show new structure
            }}
            onGoToMedia={() => {
              setWizardCompleted(true);
              setShowWizard(false);
              setActiveTab('media');
              loadLocation(); // Reload to show new structure
            }}
            onSwitchToManual={() => {
              setWizardCompleted(true);
              setShowWizard(false);
            }}
          />
        ) : activeTab === 'structure' ? (
          <LocationStructureTab 
            locationId={locationId} 
            onRunWizard={() => setShowWizard(true)}
          />
        ) : null}
        {activeTab === 'assignments' && (
          <LocationAssignmentsTab
            locationId={locationId}
            locationName={location?.name || 'Location'}
          />
        )}
        {activeTab === 'tasks' && (
          <LocationTasksTab 
            locationId={locationId}
            locationName={location?.name}
            partnerOrgId={location?.partnerOrgId}
          />
        )}
        {activeTab === 'media' && (
          <LocationMediaTab locationId={locationId} />
        )}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <LocationReferenceMedia
              locationId={locationId}
              referenceMedia={location?.intelligence?.referenceMedia || []}
              rooms={
                location?.floors
                  ? location.floors.flatMap((floor: any) =>
                      (floor.rooms || []).map((room: any) => ({
                        id: room.id,
                        name: `${room.name} (${floor.name})`,
                      }))
                    )
                  : []
              }
              onUpdate={loadLocation}
            />
          </div>
        )}
      </div>
    </div>
  );
}


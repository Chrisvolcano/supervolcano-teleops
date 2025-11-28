/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import LocationWizardStep1_BasicInfo from './LocationWizardStep1_BasicInfo';
import LocationWizardStep2_Structure from './LocationWizardStep2_Structure';
import LocationWizardStep3_Review from './LocationWizardStep3_Review';

interface CreateLocationWizardProps {
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export interface AddressData {
  street: string;
  city: string;
  state: string;
  zip: string;
  fullAddress: string;
  placeId?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface LocationData {
  name: string;
  address: string;
  addressData?: AddressData;
  organizationId: string;
  partnerOrgId?: string; // Optional - will be auto-assigned from user claims if not provided
}

export interface StructureData {
  floors: Floor[];
}

export interface Floor {
  tempId: string; // Temporary ID for UI, will be replaced with real ID after creation
  name: string;
  rooms: Room[];
}

export interface Room {
  tempId: string;
  roomTypeId: string;
  roomTypeName: string;
  customName?: string;
  targets: Target[];
}

export interface Target {
  tempId: string;
  targetTypeId: string;
  targetTypeName: string;
  actions: Action[];
}

export interface Action {
  actionTypeId: string;
  actionTypeName: string;
  tool?: string;
}

export default function CreateLocationWizard({
  organizationId,
  onClose,
  onSuccess,
}: CreateLocationWizardProps) {
  const router = useRouter();
  const { getIdToken, claims } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  
  // Get partnerOrgId from user claims if available
  const partnerOrgId = (claims?.partnerId || claims?.partner_org_id) as string | undefined;
  
  const [locationData, setLocationData] = useState<LocationData>({
    name: '',
    address: '',
    organizationId,
    partnerOrgId: partnerOrgId || organizationId, // Use partnerId from claims or fallback to organizationId
  });
  const [structureData, setStructureData] = useState<StructureData>({
    floors: [],
  });
  const [creating, setCreating] = useState(false);

  const steps = [
    { number: 1, name: 'Basic Info', icon: '📍' },
    { number: 2, name: 'Build Structure', icon: '🏗️' },
    { number: 3, name: 'Review', icon: '👁️' },
  ];

  async function handleComplete() {
    setCreating(true);
    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Step 1: Create location in Firestore
      console.log('Creating location with data:', locationData);
      
      const locationResponse = await fetch('/api/admin/locations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(locationData),
      });

      console.log('Location creation response status:', locationResponse.status);
      console.log('Location creation response headers:', Object.fromEntries(locationResponse.headers.entries()));

      // Check if response is JSON
      const contentType = locationResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await locationResponse.text();
        console.error('Non-JSON response from location API:', text);
        throw new Error(`Server returned non-JSON response: ${locationResponse.status} ${locationResponse.statusText}`);
      }

      let locationResult;
      try {
        locationResult = await locationResponse.json();
        console.log('Location creation result:', locationResult);
      } catch (jsonError) {
        const text = await locationResponse.text();
        console.error('Failed to parse JSON response:', text);
        throw new Error(`Invalid JSON response from server: ${text.substring(0, 200)}`);
      }

      if (!locationResponse.ok) {
        throw new Error(locationResult.error || `HTTP error! status: ${locationResponse.status}`);
      }

      if (!locationResult.success) {
        throw new Error(locationResult.error || 'Failed to create location');
      }

      const locationId = locationResult.locationId || locationResult.location?.id;

      if (!locationId) {
        console.error('Location result:', locationResult);
        throw new Error('Location ID not returned from API');
      }

      console.log('Location created successfully with ID:', locationId);

      // Step 2: Create structure
      for (const floor of structureData.floors) {
        // Create floor
        const floorResponse = await fetch(`/api/admin/locations/${locationId}/floors`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ name: floor.name }),
        });

        const floorResult = await floorResponse.json();

        if (!floorResult.success) {
          console.error('Failed to create floor:', floorResult);
          continue;
        }

        const floorId = floorResult.floor.id;

        // Create rooms in floor
        for (const room of floor.rooms) {
          const roomResponse = await fetch(`/api/admin/locations/${locationId}/rooms`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              floor_id: floorId,
              room_type_id: room.roomTypeId,
              custom_name: room.customName,
            }),
          });

          const roomResult = await roomResponse.json();

          if (!roomResult.success) {
            console.error('Failed to create room:', roomResult);
            continue;
          }

          const roomId = roomResult.room.id;

          // Create targets in room
          for (const target of room.targets) {
            const targetResponse = await fetch(`/api/admin/rooms/${roomId}/targets`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                target_type_id: target.targetTypeId,
              }),
            });

            const targetResult = await targetResponse.json();

            if (!targetResult.success) {
              console.error('Failed to create target:', targetResult);
              continue;
            }

            const targetId = targetResult.target.id;

            // Create actions on target
            for (const action of target.actions) {
              await fetch(`/api/admin/targets/${targetId}/actions`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  action_type_id: action.actionTypeId,
                }),
              });
            }
          }
        }
      }

      // Step 3: Generate tasks from structure
      const generateResponse = await fetch(`/api/admin/locations/${locationId}/generate-tasks`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const generateResult = await generateResponse.json();

      if (!generateResult.success) {
        console.warn('Failed to generate tasks:', generateResult);
        // Don't fail the whole operation if task generation fails
      }

      // Success! Redirect to location detail page with structure tab
      onSuccess();
      router.push(`/admin/locations/${locationId}`);
    } catch (error: any) {
      console.error('Failed to create location:', error);
      alert('Failed to create location: ' + (error.message || error));
    } finally {
      setCreating(false);
    }
  }

  const totalTasks = structureData.floors.reduce(
    (total, floor) =>
      total +
      floor.rooms.reduce(
        (roomTotal, room) =>
          roomTotal +
          room.targets.reduce(
            (targetTotal, target) => targetTotal + target.actions.length,
            0
          ),
        0
      ),
    0
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Create New Location</h2>
              <p className="text-sm text-gray-600 mt-1">
                Step {currentStep} of {steps.length}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-colors ${
                      currentStep >= step.number
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {step.icon}
                  </div>
                  <div className="ml-3">
                    <p
                      className={`text-sm font-medium ${
                        currentStep >= step.number ? 'text-gray-900' : 'text-gray-500'
                      }`}
                    >
                      {step.name}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-4 rounded ${
                      currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 1 && (
            <LocationWizardStep1_BasicInfo
              data={locationData}
              onChange={setLocationData}
            />
          )}
          {currentStep === 2 && (
            <LocationWizardStep2_Structure
              data={structureData}
              onChange={setStructureData}
            />
          )}
          {currentStep === 3 && (
            <LocationWizardStep3_Review
              locationData={locationData}
              structureData={structureData}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <div className="text-sm text-gray-600">
            {totalTasks} task{totalTasks !== 1 ? 's' : ''} will be created
          </div>

          {currentStep < 3 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={currentStep === 1 && !locationData.name}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={creating}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              {creating ? 'Creating...' : 'Create Location'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


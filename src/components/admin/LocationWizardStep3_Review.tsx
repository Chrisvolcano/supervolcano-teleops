'use client';

import { LocationData, StructureData } from './CreateLocationWizard';
import { CheckCircle } from 'lucide-react';

interface LocationWizardStep3_ReviewProps {
  locationData: LocationData;
  structureData: StructureData;
}

export default function LocationWizardStep3_Review({
  locationData,
  structureData,
}: LocationWizardStep3_ReviewProps) {
  const totalRooms = structureData.floors.reduce((total, floor) => total + floor.rooms.length, 0);
  const totalTargets = structureData.floors.reduce(
    (total, floor) =>
      total + floor.rooms.reduce((roomTotal, room) => roomTotal + room.targets.length, 0),
    0
  );
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Ready to Create Location
        </h3>
        <p className="text-gray-600">
          Review the summary below and click Create Location to finish.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Location Details</h4>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-gray-600">Name:</span>{' '}
              <span className="font-medium">{locationData.name}</span>
            </p>
            {locationData.address && (
              <p>
                <span className="text-gray-600">Address:</span> {locationData.address}
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h4 className="font-semibold text-gray-900 mb-2">Structure Summary</h4>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-3xl font-bold text-blue-600">{structureData.floors.length}</p>
              <p className="text-sm text-gray-600 mt-1">Floors</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-3xl font-bold text-purple-600">{totalRooms}</p>
              <p className="text-sm text-gray-600 mt-1">Rooms</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-3xl font-bold text-orange-600">{totalTargets}</p>
              <p className="text-sm text-gray-600 mt-1">Targets</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-3xl font-bold text-green-600">{totalTasks}</p>
              <p className="text-sm text-gray-600 mt-1">Tasks</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h4 className="font-semibold text-gray-900 mb-2">What Will Happen</h4>
          <ol className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">1.</span>
              Location will be created in the database
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">2.</span>
              Structure (floors, rooms, targets) will be saved
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">3.</span>
              {totalTasks} task{totalTasks !== 1 ? 's' : ''} will be automatically generated
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">4.</span>
              Location will be ready for cleaners to use
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}


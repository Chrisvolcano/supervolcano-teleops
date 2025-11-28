/**
 * STEP 3: REVIEW
 * Final review before creating location
 * Last updated: 2025-11-26
 */

import { CheckCircle } from 'lucide-react';

interface Step3ReviewProps {
  name: string;
  address: string;
  stats: {
    totalFloors: number;
    totalRooms: number;
    totalTargets: number;
  };
}

export default function Step3Review({ name, address, stats }: Step3ReviewProps) {
  return (
    <div className="p-6 max-w-3xl mx-auto text-center">
      {/* Success Icon */}
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle size={48} className="text-green-600" />
        </div>
      </div>

      {/* Title */}
      <div className="mb-8">
        <h3 className="text-3xl font-bold mb-3">Ready to Create Location</h3>
        <p className="text-gray-600 text-lg">
          Review the summary below and click Create Location to finish.
        </p>
      </div>

      {/* Location Details */}
      <div className="bg-gray-50 rounded-xl p-6 text-left mb-8 border border-gray-200">
        <h4 className="font-semibold text-lg mb-4">Location Details</h4>
        <div className="space-y-3">
          <div>
            <span className="text-sm text-gray-600">Name:</span>{' '}
            <span className="font-medium text-gray-900">{name}</span>
          </div>
          <div>
            <span className="text-sm text-gray-600">Address:</span>{' '}
            <span className="font-medium text-gray-900">{address}</span>
          </div>
        </div>
      </div>

      {/* Structure Summary Cards */}
      <div className="mb-8">
        <h4 className="font-semibold text-lg mb-5">Structure Summary</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="text-5xl font-bold text-blue-600 mb-2">
              {stats.totalFloors}
            </div>
            <div className="text-sm font-medium text-blue-900">
              Floor{stats.totalFloors !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <div className="text-5xl font-bold text-purple-600 mb-2">
              {stats.totalRooms}
            </div>
            <div className="text-sm font-medium text-purple-900">
              Room{stats.totalRooms !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
            <div className="text-5xl font-bold text-orange-600 mb-2">
              {stats.totalTargets}
            </div>
            <div className="text-sm font-medium text-orange-900">
              Target{stats.totalTargets !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* What Will Happen */}
      <div className="bg-blue-50 rounded-xl p-6 text-left border border-blue-200">
        <h4 className="font-semibold text-lg mb-4 text-blue-900">What Will Happen</h4>
        <ul className="space-y-2.5 text-sm text-blue-900">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">✓</span>
            <span>Location will be created with {stats.totalFloors} floor{stats.totalFloors !== 1 ? 's' : ''}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">✓</span>
            <span>{stats.totalRooms} room{stats.totalRooms !== 1 ? 's' : ''} will be added</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">✓</span>
            <span>{stats.totalTargets} target{stats.totalTargets !== 1 ? 's' : ''} will be set up</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">✓</span>
            <span>You can add actions and tasks after creation</span>
          </li>
        </ul>
      </div>
    </div>
  );
}


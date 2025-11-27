/**
 * STEP 1: BASIC INFO
 * Simple location name and address input
 * Last updated: 2025-11-26
 */

import { MapPin, Home } from 'lucide-react';

interface Step1BasicInfoProps {
  name: string;
  setName: (name: string) => void;
  address: string;
  setAddress: (address: string) => void;
}

export default function Step1BasicInfo({
  name,
  setName,
  address,
  setAddress,
}: Step1BasicInfoProps) {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Home size={28} className="text-blue-600" />
        </div>
        <h3 className="text-2xl font-bold mb-2">Location Details</h3>
        <p className="text-gray-600">
          Enter the basic information for this location. You&apos;ll build the structure in the next step.
        </p>
      </div>

      {/* Form Fields */}
      <div className="space-y-6">
        {/* Location Name */}
        <div>
          <label htmlFor="location-name" className="block text-sm font-semibold mb-2 text-gray-900">
            Location Name <span className="text-red-500">*</span>
          </label>
          <input
            id="location-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Isaac&apos;s House, Downtown Office"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={100}
            required
            aria-required="true"
            aria-describedby="name-hint"
          />
          <p id="name-hint" className="mt-1.5 text-sm text-gray-500">
            Give this location a memorable name
          </p>
        </div>

        {/* Address */}
        <div>
          <label htmlFor="location-address" className="block text-sm font-semibold mb-2 text-gray-900">
            Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-3 top-3.5 text-gray-400">
              <MapPin size={20} />
            </div>
            <input
              id="location-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, Santa Monica CA 90404"
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              aria-required="true"
              aria-describedby="address-hint"
            />
          </div>
          <p id="address-hint" className="mt-1.5 text-sm text-gray-500">
            Full street address including city, state, and ZIP
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong className="font-semibold">Next step:</strong> You&apos;ll add floors, rooms, and targets to create the complete location structure.
        </p>
      </div>
    </div>
  );
}


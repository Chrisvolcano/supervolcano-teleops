/**
 * STEP 1: BASIC INFO
 * Location name and address
 * Last updated: 2025-11-26
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AddressAutocomplete from '@/components/admin/AddressAutocomplete';

interface Step1BasicInfoProps {
  name: string;
  address: string;
  onNameChange: (name: string) => void;
  onAddressChange: (address: string) => void;
  errors: string[];
}

export default function Step1BasicInfo({
  name,
  address,
  onNameChange,
  onAddressChange,
  errors,
}: Step1BasicInfoProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Basic Information</h2>
        <p className="text-gray-600">
          Enter the location name and address to get started.
        </p>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <ul className="list-disc list-inside space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="text-red-800 text-sm">{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="location-name">Location Name</Label>
          <Input
            id="location-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g., Main Office, Test House, etc."
            className="mt-1"
          />
          <p className="text-sm text-gray-500 mt-1">
            A descriptive name for this location
          </p>
        </div>

        <div>
          <Label htmlFor="location-address">Address</Label>
          <AddressAutocomplete
            onAddressSelect={(addressData) => {
              onAddressChange(addressData.fullAddress);
            }}
            initialValue={address}
          />
          <p className="text-sm text-gray-500 mt-1">
            Full street address for this location
          </p>
        </div>
      </div>
    </div>
  );
}


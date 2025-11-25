'use client';

import { LocationData, AddressData } from './CreateLocationWizard';
import AddressAutocomplete from './AddressAutocomplete';

interface LocationWizardStep1_BasicInfoProps {
  data: LocationData;
  onChange: (data: LocationData) => void;
}

export default function LocationWizardStep1_BasicInfo({
  data,
  onChange,
}: LocationWizardStep1_BasicInfoProps) {
  const handleAddressChange = (addressData: AddressData) => {
    // Store the full address string and structured address data
    onChange({ 
      ...data, 
      address: addressData.fullAddress,
      addressData: addressData
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Location Details</h3>
        <p className="text-gray-600">
          Enter the basic information about this location.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location Name *
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            placeholder="e.g., Isaac's House"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <AddressAutocomplete
            value={data.address}
            onChange={handleAddressChange}
            placeholder="Start typing an address..."
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          💡 <strong>Next step:</strong> You will build the structure of this location by
          adding floors, rooms, and cleaning targets.
        </p>
      </div>
    </div>
  );
}


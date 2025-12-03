'use client';

import React from 'react';
import { Key, Lock, Wifi, Phone, Car, AlertTriangle } from 'lucide-react';
import { AccessInfo, EntryMethod } from '@/types/location-intelligence';

interface AccessInfoStepProps {
  accessInfo: AccessInfo;
  onChange: (accessInfo: AccessInfo) => void;
}

const ENTRY_METHODS: { value: EntryMethod; label: string }[] = [
  { value: 'key', label: 'Physical Key' },
  { value: 'code', label: 'Door Code' },
  { value: 'lockbox', label: 'Lockbox' },
  { value: 'smart_lock', label: 'Smart Lock' },
  { value: 'other', label: 'Other' },
];

export default function AccessInfoStep({ accessInfo, onChange }: AccessInfoStepProps) {
  const updateField = <K extends keyof AccessInfo>(key: K, value: AccessInfo[K]) => {
    onChange({ ...accessInfo, [key]: value });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Key className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Access Information</h2>
        <p className="mt-2 text-gray-600">
          How should cleaners access this property? (Optional but recommended)
        </p>
      </div>

      {/* Entry Method */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Entry Method</label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {ENTRY_METHODS.map((method) => (
            <button
              key={method.value}
              type="button"
              onClick={() => updateField('entryMethod', method.value)}
              className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${
                accessInfo.entryMethod === method.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Key className="h-5 w-5" />
              <span className="text-sm font-medium">{method.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Entry Details */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Entry Details</label>
        <textarea
          value={accessInfo.entryDetails || ''}
          onChange={(e) => updateField('entryDetails', e.target.value)}
          placeholder="e.g., Lockbox on back porch near BBQ, code is 1234"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
          rows={2}
        />
      </div>

      {/* Alarm */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900">Alarm System</h3>
            <div className="grid md:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-sm font-medium text-yellow-900 mb-1">Alarm Code</label>
                <input
                  type="text"
                  value={accessInfo.alarmCode || ''}
                  onChange={(e) => updateField('alarmCode', e.target.value)}
                  placeholder="e.g., 5678"
                  className="w-full px-3 py-2 border border-yellow-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-yellow-900 mb-1">Panel Location</label>
                <input
                  type="text"
                  value={accessInfo.alarmLocation || ''}
                  onChange={(e) => updateField('alarmLocation', e.target.value)}
                  placeholder="e.g., Inside front door on left"
                  className="w-full px-3 py-2 border border-yellow-300 rounded-lg bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WiFi */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Wifi className="h-6 w-6 text-gray-600 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">WiFi Access</h3>
            <p className="text-sm text-gray-600 mb-3">For robot/device connectivity</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Network Name</label>
                <input
                  type="text"
                  value={accessInfo.wifiNetwork || ''}
                  onChange={(e) => updateField('wifiNetwork', e.target.value)}
                  placeholder="e.g., SmithFamily_5G"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="text"
                  value={accessInfo.wifiPassword || ''}
                  onChange={(e) => updateField('wifiPassword', e.target.value)}
                  placeholder="WiFi password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Phone className="h-6 w-6 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Emergency Contact</h3>
            <div className="grid md:grid-cols-3 gap-4 mt-3">
              <input
                type="text"
                value={accessInfo.emergencyContact?.name || ''}
                onChange={(e) => updateField('emergencyContact', {
                  ...accessInfo.emergencyContact,
                  name: e.target.value,
                  phone: accessInfo.emergencyContact?.phone || '',
                  relationship: accessInfo.emergencyContact?.relationship || '',
                })}
                placeholder="Name"
                className="w-full px-3 py-2 border border-red-300 rounded-lg bg-white"
              />
              <input
                type="tel"
                value={accessInfo.emergencyContact?.phone || ''}
                onChange={(e) => updateField('emergencyContact', {
                  ...accessInfo.emergencyContact,
                  name: accessInfo.emergencyContact?.name || '',
                  phone: e.target.value,
                  relationship: accessInfo.emergencyContact?.relationship || '',
                })}
                placeholder="Phone"
                className="w-full px-3 py-2 border border-red-300 rounded-lg bg-white"
              />
              <input
                type="text"
                value={accessInfo.emergencyContact?.relationship || ''}
                onChange={(e) => updateField('emergencyContact', {
                  ...accessInfo.emergencyContact,
                  name: accessInfo.emergencyContact?.name || '',
                  phone: accessInfo.emergencyContact?.phone || '',
                  relationship: e.target.value,
                })}
                placeholder="Relationship (Owner, Neighbor)"
                className="w-full px-3 py-2 border border-red-300 rounded-lg bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Parking */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Car className="h-4 w-4 inline mr-2" />
          Parking Instructions
        </label>
        <input
          type="text"
          value={accessInfo.parkingInstructions || ''}
          onChange={(e) => updateField('parkingInstructions', e.target.value)}
          placeholder="e.g., Park in driveway, not on street"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl"
        />
      </div>
    </div>
  );
}


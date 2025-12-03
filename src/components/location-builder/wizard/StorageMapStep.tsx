'use client';

import React from 'react';
import { Package, Plus, Trash2, MapPin } from 'lucide-react';
import { StorageLocation, StorageItemType } from '@/types/location-intelligence';
import { FloorData } from '@/hooks/useLocationWizard';

interface StorageMapStepProps {
  storageLocations: StorageLocation[];
  floors: FloorData[];
  onChange: (storageLocations: StorageLocation[]) => void;
}

const STORAGE_ITEMS: { type: StorageItemType; label: string; emoji: string }[] = [
  { type: 'vacuum', label: 'Vacuum', emoji: '🧹' },
  { type: 'mop', label: 'Mop & Bucket', emoji: '🪣' },
  { type: 'broom', label: 'Broom', emoji: '🧹' },
  { type: 'cleaning_supplies', label: 'Cleaning Supplies', emoji: '🧴' },
  { type: 'trash_bags', label: 'Trash Bags', emoji: '🗑️' },
  { type: 'linens', label: 'Linens', emoji: '🛏️' },
  { type: 'towels', label: 'Towels', emoji: '🛁' },
  { type: 'toilet_paper', label: 'Toilet Paper', emoji: '🧻' },
  { type: 'paper_towels', label: 'Paper Towels', emoji: '🧻' },
  { type: 'other', label: 'Other', emoji: '📦' },
];

export default function StorageMapStep({ storageLocations, floors, onChange }: StorageMapStepProps) {
  const generateId = () => Math.random().toString(36).substring(2, 15);

  const addItem = (itemType: StorageItemType) => {
    onChange([...storageLocations, { id: generateId(), itemType, location: '' }]);
  };

  const updateItem = (id: string, updates: Partial<StorageLocation>) => {
    onChange(storageLocations.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const removeItem = (id: string) => {
    onChange(storageLocations.filter(item => item.id !== id));
  };

  const allRooms = floors.flatMap(floor => 
    (floor.rooms || []).map((room: any) => ({
      id: room.id,
      name: `${floor.name} - ${room.name}`,
    }))
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
          <Package className="h-8 w-8 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Storage Map</h2>
        <p className="mt-2 text-gray-600">
          Where are cleaning supplies stored? This helps cleaners find what they need.
        </p>
      </div>

      {/* Quick Add */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Click to add supplies available at this location
        </label>
        <div className="flex flex-wrap gap-2">
          {STORAGE_ITEMS.map((item) => {
            const exists = storageLocations.some(s => s.itemType === item.type);
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => addItem(item.type)}
                className={`px-4 py-2 rounded-full border-2 flex items-center gap-2 transition-all ${
                  exists
                    ? 'border-green-300 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                }`}
              >
                <span>{item.emoji}</span>
                <span className="text-sm font-medium">{item.label}</span>
                {exists ? <span>✓</span> : <Plus className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Storage List */}
      {storageLocations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Storage Locations ({storageLocations.length})</h3>
          
          {storageLocations.map((item) => {
            const info = STORAGE_ITEMS.find(i => i.type === item.itemType);
            return (
              <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{info?.emoji}</span>
                    <span className="font-semibold">{item.customItemName || info?.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                {item.itemType === 'other' && (
                  <input
                    type="text"
                    value={item.customItemName || ''}
                    onChange={(e) => updateItem(item.id, { customItemName: e.target.value })}
                    placeholder="Item name"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <MapPin className="h-4 w-4 inline mr-1" />
                      Where is it?
                    </label>
                    <input
                      type="text"
                      value={item.location}
                      onChange={(e) => updateItem(item.id, { location: e.target.value })}
                      placeholder="e.g., Hall closet, top shelf"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                    <select
                      value={item.roomId || ''}
                      onChange={(e) => updateItem(item.id, { roomId: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select room...</option>
                      {allRooms.map((room) => (
                        <option key={room.id} value={room.id}>{room.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <input
                  type="text"
                  value={item.notes || ''}
                  onChange={(e) => updateItem(item.id, { notes: e.target.value })}
                  placeholder="Notes (optional) - e.g., Blue bucket, not red"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {storageLocations.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Click items above to map where supplies are stored</p>
        </div>
      )}
    </div>
  );
}


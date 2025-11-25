/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Building2, ListTodo, Settings, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import LocationStructureTab from '@/components/admin/LocationStructureTab';
import LocationTasksTab from '@/components/admin/LocationTasksTab';

type Tab = 'structure' | 'tasks' | 'settings';

export default function AdminLocationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { getIdToken } = useAuth();
  const locationId = params.id as string;

  const [location, setLocation] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('structure');
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading location...</p>
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
        {activeTab === 'structure' && (
          <LocationStructureTab locationId={locationId} />
        )}
        {activeTab === 'tasks' && (
          <LocationTasksTab locationId={locationId} />
        )}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Location Settings</h2>
            <p className="text-gray-600">Settings coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}


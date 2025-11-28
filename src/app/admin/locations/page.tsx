/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MapPin, 
  Search, 
  Building2,
  Plus,
  Loader2,
  ArrowRight,
  UserPlus
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import AssignCleanersModal from '@/components/admin/AssignCleanersModal';
import CreateLocationWizard from '@/components/admin/CreateLocationWizard';

export default function AdminLocationsPage() {
  const router = useRouter();
  const { getIdToken } = useAuth();
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  
  useEffect(() => {
    loadLocations();
  }, []);
  
  async function loadLocations() {
    try {
      const token = await getIdToken();
      if (!token) return;

      // Query Firestore (source of truth)
      const response = await fetch('/api/admin/locations/firestore', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setLocations(data.locations);
      }
    } catch (error) {
      console.error('Failed to load locations:', error);
    } finally {
      setLoading(false);
    }
  }
  
  const filteredLocations = useMemo(() => {
    return locations.filter(loc =>
      loc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loc.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loc.assignedOrganizationName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [locations, searchTerm]);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Locations</h1>
          <p className="text-gray-600">
            Manage locations, tasks, SOPs, and robot intelligence
          </p>
        </div>
        
        <button
          onClick={() => setShowWizard(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Location
        </button>
      </div>
      
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search locations..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>
      
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>{locations.length} locations</strong> in Firestore (source of truth). 
          Use the &quot;Sync from Firestore&quot; button in Robot Intelligence to update the SQL database for robot queries.
        </p>
      </div>
      
      {/* Locations Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : filteredLocations.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">
            {searchTerm ? 'No locations found' : 'No locations yet'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLocations.map((location) => (
              <div
                key={location.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:border-purple-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-purple-600" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                </div>
                
                <button
                  onClick={() => router.push(`/admin/locations/${location.id}`)}
                  className="text-left w-full"
                >
                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">
                    {location.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">{location.address}</p>
                  
                  {location.assignedOrganizationName && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Building2 className="h-3 w-3" />
                      <span>{location.assignedOrganizationName}</span>
                    </div>
                  )}
                </button>
                
                {/* Assign Cleaners Button */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLocationId(location.id);
                      setSelectedLocationName(location.name);
                      setAssignModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors w-full"
                  >
                    <UserPlus className="h-4 w-4" />
                    Assign Cleaners
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Assignment Modal */}
          {assignModalOpen && selectedLocationId && (
            <AssignCleanersModal
              locationId={selectedLocationId}
              locationName={selectedLocationName}
              onClose={() => {
                setAssignModalOpen(false);
                setSelectedLocationId(null);
                setSelectedLocationName('');
              }}
              onSuccess={() => {
                // Optionally reload locations to show assignment count
                loadLocations();
              }}
            />
          )}

          {showWizard && (
            <CreateLocationWizard
              organizationId={''} // Will be set when organization selection is implemented
              onClose={() => setShowWizard(false)}
              onSuccess={() => {
                setShowWizard(false);
                loadLocations();
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

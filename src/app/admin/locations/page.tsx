'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MapPin, 
  Search, 
  Building2,
  Plus,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function AdminLocationsPage() {
  const router = useRouter();
  const { getIdToken } = useAuth();
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    loadLocations();
  }, []);
  
  async function loadLocations() {
    try {
      const token = await getIdToken();
      if (!token) return;

      const response = await fetch('/api/admin/locations', {
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
  
  const filteredLocations = locations.filter(loc =>
    loc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.organization_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
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
          onClick={() => router.push('/admin/locations/new')}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLocations.map((location) => (
            <button
              key={location.id}
              onClick={() => router.push(`/admin/locations/${location.id}`)}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:border-purple-300 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-purple-600" />
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
              </div>
              
              <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">
                {location.name}
              </h3>
              <p className="text-sm text-gray-600 mb-3">{location.address}</p>
              
              {location.organization_name && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Building2 className="h-3 w-3" />
                  <span>{location.organization_name}</span>
                </div>
              )}
              
              {(location.task_count > 0 || location.moment_count > 0) && (
                <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                  {location.task_count > 0 && (
                    <span>{location.task_count} task{location.task_count !== 1 ? 's' : ''}</span>
                  )}
                  {location.moment_count > 0 && (
                    <span>{location.moment_count} moment{location.moment_count !== 1 ? 's' : ''}</span>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * ASSIGN CLEANER MODAL
 * Modal for assigning field operators to locations
 * Features: User search, role selection, error handling
 * Last updated: 2025-11-26
 */

'use client';

import { useState, useEffect } from 'react';
import { X, UserPlus, Search, Loader } from 'lucide-react';
import { getAuth } from 'firebase/auth';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId?: string;
}

interface AssignCleanerModalProps {
  locationId: string;
  locationName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignCleanerModal({
  locationId,
  locationName,
  onClose,
  onSuccess,
}: AssignCleanerModalProps) {
  const [cleaners, setCleaners] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCleaners, setLoadingCleaners] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCleaners();
  }, []);

  const loadCleaners = async () => {
    try {
      console.log('[Modal] Loading cleaners...');
      setLoadingCleaners(true);
      
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Not authenticated');
      }

      const token = await user.getIdToken();
      console.log('[Modal] Got auth token');
      
      // Fetch both location_cleaner and oem_teleoperator roles
      // We'll filter by organizationId to match the location
      const response = await fetch('/api/admin/users?role=location_cleaner', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      // Also fetch oem_teleoperators if needed (you can combine both queries)
      const responseOem = await fetch('/api/admin/users?role=oem_teleoperator', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('[Modal] Response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to load cleaners');
      }

      const data = await response.json();
      const dataOem = await responseOem.json();
      
      // Combine both responses
      const allUsers = [...(data.users || []), ...(dataOem.users || [])];
      
      console.log('[Modal] Response data:', data);
      console.log('[Modal] Users count:', allUsers.length);
      
      // Transform users to match modal's expected format
      const transformedUsers: User[] = allUsers.map((user: any) => ({
        id: user.uid,
        name: user.displayName || user.firestore?.displayName || user.email.split('@')[0],
        email: user.email,
        role: user.auth?.role || user.firestore?.role || 'location_cleaner',
        organizationId: user.auth?.organizationId || user.firestore?.organizationId,
      }));
      
      console.log('[Modal] Transformed users:', transformedUsers.map((u: any) => ({ email: u.email, name: u.name, orgId: u.organizationId })));
      
      // Check for test cleaner specifically
      const testCleaner = transformedUsers.find((u: any) => u.email === 'testcleaner@supervolcano.com');
      if (testCleaner) {
        console.log('[Modal] ✅ Test Cleaner FOUND:', testCleaner);
        console.log('[Modal] Test cleaner orgId:', testCleaner.organizationId);
      } else {
        console.warn('[Modal] ❌ Test Cleaner NOT FOUND in response');
      }
      
      // Log any cleaners missing required fields (helpful for debugging)
      const invalidCleaners = transformedUsers.filter(
        (user: any) => !user.organizationId
      );
      
      if (invalidCleaners.length > 0) {
        console.warn(
          '[Modal] Found cleaners missing organization fields:',
          invalidCleaners.map((u: any) => u.email)
        );
      }
      
      setCleaners(transformedUsers);
      console.log('[Modal] Cleaners set in state');
    } catch (err: any) {
      console.error('[Modal] Error loading cleaners:', err);
      setError(err.message);
    } finally {
      setLoadingCleaners(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUserId) {
      setError('Please select a cleaner');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Not authenticated');
      }

      const token = await user.getIdToken();

      // Determine role based on selected user
      const selectedUser = cleaners.find(c => c.id === selectedUserId);
      const workerRole = selectedUser?.role || 'location_cleaner';

      const response = await fetch(`/api/admin/locations/${locationId}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: selectedUserId,
          role: workerRole,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign cleaner');
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error assigning cleaner:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredCleaners = cleaners.filter(cleaner =>
    cleaner.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cleaner.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <UserPlus size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Assign Cleaner</h2>
              <p className="text-sm text-gray-600">{locationName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Search */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Search Cleaners
            </label>
            <div className="relative">
              <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Cleaners List */}
          {loadingCleaners ? (
            <div className="flex items-center justify-center py-8">
              <Loader size={24} className="animate-spin text-gray-400" />
            </div>
          ) : filteredCleaners.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {searchQuery ? 'No cleaners found' : 'No cleaners available'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCleaners.map((cleaner) => (
                <label
                  key={cleaner.id}
                  className={`
                    flex items-center p-3 border rounded-lg cursor-pointer transition-colors
                    ${selectedUserId === cleaner.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="cleaner"
                    value={cleaner.id}
                    checked={selectedUserId === cleaner.id}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="mr-3 w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{cleaner.name || 'Unknown'}</div>
                    <div className="text-sm text-gray-500">{cleaner.email || ''}</div>
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={loading || !selectedUserId}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader size={16} className="animate-spin" />
                Assigning...
              </>
            ) : (
              'Assign Cleaner'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


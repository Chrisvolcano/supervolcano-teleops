'use client';

import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { User, Building2, Users, HelpCircle } from 'lucide-react';

export type ContributorType = 'location_owner' | 'cleaning_company' | 'individual' | 'other';

export interface ContributorData {
  contributorType: ContributorType;
  contributorId: string | null;
  contributorOrgId: string | null;
  contributorName: string;
}

interface ContributorSelectorProps {
  value: ContributorData;
  onChange: (data: ContributorData) => void;
  compact?: boolean;
}

export default function ContributorSelector({ value, onChange, compact = false }: ContributorSelectorProps) {
  const [locationOwners, setLocationOwners] = useState<{ id: string; name: string; email: string }[]>([]);
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      // Fetch location owners
      const usersRes = await fetch('/api/admin/users?role=location_owner', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const usersData = await usersRes.json();
      setLocationOwners((usersData.users || []).map((u: any) => ({
        id: u.uid,
        name: u.displayName || u.firestore?.displayName || u.email?.split('@')[0] || 'Unknown',
        email: u.email,
      })));

      // Fetch organizations (cleaning companies)
      const orgsRes = await fetch('/api/v1/organizations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const orgsData = await orgsRes.json();
      setOrganizations((orgsData.organizations || []).map((o: any) => ({
        id: o.id,
        name: o.name,
      })));
    } catch (err) {
      console.error('Failed to load contributor options:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type: ContributorType) => {
    onChange({
      contributorType: type,
      contributorId: null,
      contributorOrgId: null,
      contributorName: '',
    });
  };

  const handleSelectionChange = (id: string, name: string) => {
    onChange({
      ...value,
      contributorId: value.contributorType === 'location_owner' || value.contributorType === 'individual' ? id : null,
      contributorOrgId: value.contributorType === 'cleaning_company' ? id : null,
      contributorName: name,
    });
  };

  const contributorTypes = [
    { type: 'location_owner' as const, label: 'Location Owner', icon: User },
    { type: 'cleaning_company' as const, label: 'Cleaning Company', icon: Building2 },
    { type: 'individual' as const, label: 'Individual Contributor', icon: Users },
    { type: 'other' as const, label: 'Other', icon: HelpCircle },
  ];

  return (
    <div className="space-y-4">
      {/* Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Contributor Type
        </label>
        <div className={compact ? "flex flex-wrap gap-2" : "grid grid-cols-2 gap-2"}>
          {contributorTypes.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => handleTypeChange(type)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                value.contributorType === type
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Selection/Input based on type */}
      <div>
        {value.contributorType === 'location_owner' && (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Location Owner
            </label>
            <select
              value={value.contributorId || ''}
              onChange={(e) => {
                const owner = locationOwners.find(o => o.id === e.target.value);
                if (owner) handleSelectionChange(owner.id, owner.name);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="">Select owner...</option>
              {locationOwners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name} ({owner.email})
                </option>
              ))}
            </select>
          </>
        )}

        {value.contributorType === 'cleaning_company' && (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Company
            </label>
            <select
              value={value.contributorOrgId || ''}
              onChange={(e) => {
                const org = organizations.find(o => o.id === e.target.value);
                if (org) handleSelectionChange(org.id, org.name);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="">Select company...</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </>
        )}

        {(value.contributorType === 'individual' || value.contributorType === 'other') && (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {value.contributorType === 'individual' ? 'Contributor Name' : 'Attribution'}
            </label>
            <input
              type="text"
              value={value.contributorName}
              onChange={(e) => onChange({ ...value, contributorName: e.target.value })}
              placeholder={value.contributorType === 'individual' ? 'e.g., John Smith' : 'e.g., Field Test December'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </>
        )}
      </div>
    </div>
  );
}


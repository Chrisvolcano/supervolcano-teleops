/**
 * ORGANIZATIONS PAGE
 * Manage OEM partners and location owners
 * Updated to use new organization architecture with tabs
 */

'use client';

import { useState, useEffect } from 'react';
import { Plus, Building2, Factory } from 'lucide-react';
import { organizationsService } from '@/services/organizations.service';
import type { Organization, OrganizationType } from '@/types/organization.types';
import { OrganizationCard } from '@/components/admin/organizations/OrganizationCard';
import { CreateOrganizationModal } from '@/components/admin/organizations/CreateOrganizationModal';

type TabType = 'oem_partners' | 'location_owner';

export default function OrganizationsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('oem_partners');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, [activeTab]);

  async function loadOrganizations() {
    setLoading(true);
    try {
      const type: OrganizationType = activeTab === 'oem_partners' ? 'oem_partner' : 'location_owner';
      const orgs = await organizationsService.listOrganizations(type);
      setOrganizations(orgs);
    } catch (error: any) {
      console.error('Failed to load organizations:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleCreateSuccess() {
    setShowCreateModal(false);
    loadOrganizations();
  }

  const getOrgType = (): OrganizationType => {
    return activeTab === 'oem_partners' ? 'oem_partner' : 'location_owner';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage OEM partners and location owners
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Organization
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('oem_partners')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'oem_partners'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Factory className="w-4 h-4" />
              <span className="font-medium">OEM Partners</span>
            </button>
            <button
              onClick={() => setActiveTab('location_owner')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'location_owner'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span className="font-medium">Location Owners</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {activeTab === 'oem_partners' ? (
                <Factory className="w-8 h-8 text-gray-400" />
              ) : (
                <Building2 className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No {activeTab === 'oem_partners' ? 'OEM Partners' : 'Location Owners'} Yet
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Create your first organization to get started
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Create Organization
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map((org) => (
              <OrganizationCard
                key={org.id}
                organization={org}
                onUpdate={loadOrganizations}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateOrganizationModal
          type={getOrgType()}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
}

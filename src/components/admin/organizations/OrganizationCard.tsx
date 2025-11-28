/**
 * ORGANIZATION CARD
 * Displays organization with quick actions
 */

'use client';

import { useState } from 'react';
import { Building2, Mail, Phone, Edit, Trash2, MoreVertical } from 'lucide-react';
import type { Organization } from '@/types/organization.types';

interface OrganizationCardProps {
  organization: Organization;
  onUpdate: () => void;
}

export function OrganizationCard({ organization, onUpdate }: OrganizationCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{organization.name}</h3>
            <p className="text-sm text-gray-500">{organization.slug}</p>
          </div>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contact Info */}
      {(organization.contactEmail || organization.contactPhone) && (
        <div className="space-y-2 mb-4">
          {organization.contactEmail && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-4 h-4" />
              <span>{organization.contactEmail}</span>
            </div>
          )}
          {organization.contactPhone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4" />
              <span>{organization.contactPhone}</span>
            </div>
          )}
        </div>
      )}

      {/* Status Badge */}
      {organization.billingStatus && (
        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          {organization.billingStatus}
        </div>
      )}
    </div>
  );
}


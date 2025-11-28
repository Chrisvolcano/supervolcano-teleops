'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import ContextualTaskWizard, { TaskFormData } from './ContextualTaskWizard';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

interface ContextualTaskWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  locationId?: string;
  locationName?: string;
  partnerOrgId?: string;
}

export default function ContextualTaskWizardModal({
  isOpen,
  onClose,
  onSuccess,
  locationId,
  locationName,
  partnerOrgId
}: ContextualTaskWizardModalProps) {
  const { getIdToken } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (taskData: TaskFormData) => {
    setSubmitting(true);
    try {
      const token = await getIdToken();
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      // Build task payload
      const payload: any = {
        locationId: locationId || '',
        locationName: locationName || taskData.address?.fullAddress || '',
        partnerOrgId: partnerOrgId || 'demo-org',
        title: taskData.title || `${taskData.action} ${taskData.target} in ${taskData.room}`,
        description: taskData.description || '',
        category: `${taskData.room} - ${taskData.target}`,
        estimatedDurationMinutes: taskData.estimatedDuration || null,
        priority: taskData.priority || 'medium',
        // Add hierarchical data
        room: taskData.room,
        target: taskData.target,
        action: taskData.action,
        tool: taskData.tool || null,
        // Add address data if provided
        ...(taskData.address && {
          address: {
            street: taskData.address.street,
            city: taskData.address.city,
            state: taskData.address.state,
            zip: taskData.address.zip,
            fullAddress: taskData.address.fullAddress,
            placeId: taskData.address.placeId,
            coordinates: taskData.address.coordinates
          }
        })
      };

      // Create task via API
      const response = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create task');
      }

      toast.success('Task created successfully!');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Failed to create task:', error);
      toast.error(error.message || 'Failed to create task');
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Create New Task
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
                disabled={submitting}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
              <ContextualTaskWizard
                locationId={locationId}
                locationName={locationName}
                partnerOrgId={partnerOrgId}
                onSubmit={handleSubmit}
                onCancel={onClose}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




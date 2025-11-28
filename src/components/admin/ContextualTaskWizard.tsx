'use client';

import { useState, useEffect } from 'react';
import AddressAutocomplete, { AddressData } from './AddressAutocomplete';
import {
  ROOM_TARGET_MAP,
  getValidTargets,
  getValidActions,
  getValidTools,
  formatDisplayText
} from '@/constants/taskHierarchy';

interface ContextualTaskWizardProps {
  locationId?: string;
  locationName?: string;
  partnerOrgId?: string;
  onSubmit: (taskData: TaskFormData) => Promise<void>;
  onCancel?: () => void;
  initialValues?: Partial<TaskFormData>;
}

export interface TaskFormData {
  address: AddressData | null;
  room: string;
  target: string;
  action: string;
  tool: string;
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  estimatedDuration?: number;
}

export default function ContextualTaskWizard({
  locationId,
  locationName,
  partnerOrgId,
  onSubmit,
  onCancel,
  initialValues
}: ContextualTaskWizardProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    address: initialValues?.address || null,
    room: initialValues?.room || '',
    target: initialValues?.target || '',
    action: initialValues?.action || '',
    tool: initialValues?.tool || '',
    title: initialValues?.title || '',
    description: initialValues?.description || '',
    priority: initialValues?.priority || 'medium',
    estimatedDuration: initialValues?.estimatedDuration
  });

  const [availableTargets, setAvailableTargets] = useState<string[]>([]);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [availableTools, setAvailableTools] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update available targets when room changes
  useEffect(() => {
    if (formData.room) {
      const targets = getValidTargets(formData.room);
      setAvailableTargets(targets);

      // Clear dependent fields if target is no longer valid
      setFormData(prev => {
        if (prev.target && !targets.includes(prev.target)) {
          return { ...prev, target: '', action: '', tool: '' };
        }
        return prev;
      });
      setAvailableActions([]);
      setAvailableTools([]);
    } else {
      setAvailableTargets([]);
      setFormData(prev => ({ ...prev, target: '', action: '', tool: '' }));
      setAvailableActions([]);
      setAvailableTools([]);
    }
  }, [formData.room]);

  // Update available actions when room or target changes
  useEffect(() => {
    if (formData.room && formData.target) {
      const actions = getValidActions(formData.room, formData.target);
      setAvailableActions(actions);

      // Clear dependent fields if action is no longer valid
      setFormData(prev => {
        if (prev.action && !actions.includes(prev.action)) {
          return { ...prev, action: '', tool: '' };
        }
        return prev;
      });
      setAvailableTools([]);
    } else {
      setAvailableActions([]);
      setFormData(prev => ({ ...prev, action: '', tool: '' }));
      setAvailableTools([]);
    }
  }, [formData.room, formData.target]);

  // Update available tools when room, target, or action changes
  useEffect(() => {
    if (formData.room && formData.target && formData.action) {
      const tools = getValidTools(formData.room, formData.target, formData.action);
      setAvailableTools(tools);

      // Clear tool if it's no longer valid
      setFormData(prev => {
        if (prev.tool && !tools.includes(prev.tool)) {
          return { ...prev, tool: '' };
        }
        return prev;
      });
    } else {
      setAvailableTools([]);
      setFormData(prev => ({ ...prev, tool: '' }));
    }
  }, [formData.room, formData.target, formData.action]);

  // Auto-generate title from selections
  useEffect(() => {
    if (formData.room && formData.target && formData.action) {
      const roomText = formatDisplayText(formData.room);
      const targetText = formatDisplayText(formData.target);
      const actionText = formatDisplayText(formData.action);
      const autoTitle = `${actionText} ${targetText} in ${roomText}`;
      
      setFormData(prev => {
        if (!prev.title || prev.title === autoTitle || prev.title.startsWith(actionText)) {
          return { ...prev, title: autoTitle };
        }
        return prev;
      });
    }
  }, [formData.room, formData.target, formData.action]);

  const handleRoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      room: e.target.value,
      target: '',
      action: '',
      tool: ''
    }));
    setErrors(prev => ({ ...prev, room: '' }));
  };

  const handleTargetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      target: e.target.value,
      action: '',
      tool: ''
    }));
    setErrors(prev => ({ ...prev, target: '' }));
  };

  const handleActionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      action: e.target.value,
      tool: ''
    }));
    setErrors(prev => ({ ...prev, action: '' }));
  };

  const handleToolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      tool: e.target.value
    }));
  };

  const handleAddressChange = (addressData: AddressData) => {
    setFormData(prev => ({ ...prev, address: addressData }));
    setErrors(prev => ({ ...prev, address: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.address && !locationId) {
      newErrors.address = 'Please select an address';
    }
    if (!formData.room) {
      newErrors.room = 'Please select a room';
    }
    if (!formData.target) {
      newErrors.target = 'Please select a target';
    }
    if (!formData.action) {
      newErrors.action = 'Please select an action';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Failed to submit task:', error);
      setErrors({ submit: 'Failed to create task. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Create New Task</h2>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Address Autocomplete - Only show if no locationId */}
      {!locationId && (
        <AddressAutocomplete
          value={formData.address?.fullAddress}
          onChange={handleAddressChange}
          error={errors.address}
        />
      )}

      {/* Location Name Display */}
      {locationId && locationName && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-gray-900">{locationName}</p>
          </div>
        </div>
      )}

      {/* Room Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Room <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.room}
          onChange={handleRoomChange}
          required
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
            errors.room ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Select a room</option>
          {Object.keys(ROOM_TARGET_MAP).map(room => (
            <option key={room} value={room}>
              {formatDisplayText(room)}
            </option>
          ))}
        </select>
        {errors.room && <p className="text-red-500 text-sm mt-1">{errors.room}</p>}
      </div>

      {/* Target Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Target <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.target}
          onChange={handleTargetChange}
          disabled={!formData.room}
          required
          className={`w-full px-4 py-2 border rounded-lg transition-all ${
            !formData.room
              ? 'bg-gray-100 opacity-60 cursor-not-allowed border-gray-200'
              : errors.target
              ? 'border-red-500'
              : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          }`}
        >
          <option value="">
            {!formData.room ? 'Select a room first' : 'Select a target'}
          </option>
          {availableTargets.map(target => (
            <option key={target} value={target}>
              {formatDisplayText(target)}
            </option>
          ))}
        </select>
        {errors.target && <p className="text-red-500 text-sm mt-1">{errors.target}</p>}
        {!formData.room && (
          <p className="text-gray-500 text-xs mt-1">Select a room to see available targets</p>
        )}
      </div>

      {/* Action Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Action <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.action}
          onChange={handleActionChange}
          disabled={!formData.room || !formData.target}
          required
          className={`w-full px-4 py-2 border rounded-lg transition-all ${
            !formData.room || !formData.target
              ? 'bg-gray-100 opacity-60 cursor-not-allowed border-gray-200'
              : errors.action
              ? 'border-red-500'
              : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          }`}
        >
          <option value="">
            {!formData.room || !formData.target ? 'Select room and target first' : 'Select an action'}
          </option>
          {availableActions.map(action => (
            <option key={action} value={action}>
              {formatDisplayText(action)}
            </option>
          ))}
        </select>
        {errors.action && <p className="text-red-500 text-sm mt-1">{errors.action}</p>}
        {(!formData.room || !formData.target) && (
          <p className="text-gray-500 text-xs mt-1">Select room and target to see available actions</p>
        )}
      </div>

      {/* Tool Selection (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tool Used <span className="text-gray-500 text-xs">(Optional)</span>
        </label>
        <select
          value={formData.tool}
          onChange={handleToolChange}
          disabled={!formData.room || !formData.target || !formData.action}
          className={`w-full px-4 py-2 border rounded-lg transition-all ${
            !formData.room || !formData.target || !formData.action
              ? 'bg-gray-100 opacity-60 cursor-not-allowed border-gray-200'
              : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          }`}
        >
          <option value="">
            {!formData.room || !formData.target || !formData.action
              ? 'Complete fields above to see tool options'
              : 'Select a tool (optional)'}
          </option>
          {availableTools.map(tool => (
            <option key={tool} value={tool}>
              {tool}
            </option>
          ))}
        </select>
        {availableTools.length === 0 && formData.room && formData.target && formData.action && (
          <p className="text-gray-500 text-xs mt-1">No specific tools needed for this task</p>
        )}
        {(!formData.room || !formData.target || !formData.action) && (
          <p className="text-gray-500 text-xs mt-1">Complete the fields above to see relevant tool options</p>
        )}
      </div>

      {/* Task Title (Auto-generated, editable) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Task Title
        </label>
        <input
          type="text"
          value={formData.title || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Task title (auto-generated)"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Task Description (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-gray-500 text-xs">(Optional)</span>
        </label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Add any additional details about this task..."
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Priority
        </label>
        <select
          value={formData.priority}
          onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      {/* Estimated Duration (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Estimated Duration (minutes) <span className="text-gray-500 text-xs">(Optional)</span>
        </label>
        <input
          type="number"
          value={formData.estimatedDuration || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, estimatedDuration: e.target.value ? parseInt(e.target.value) : undefined }))}
          placeholder="e.g., 30"
          min="1"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Error Message */}
      {errors.submit && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{errors.submit}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Creating Task...' : 'Create Task'}
      </button>

      {/* Debug Info (Development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold mb-2">Form Data (Debug):</h3>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(formData, null, 2)}
          </pre>
        </div>
      )}
    </form>
  );
}


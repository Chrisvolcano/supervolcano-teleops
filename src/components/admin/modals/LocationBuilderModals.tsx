/**
 * LOCATION BUILDER MODALS
 * 
 * Self-contained modal components for the location builder.
 * Each modal manages its own loading state.
 * 
 * Last updated: 2025-11-26
 */

import { useState, useEffect } from 'react';
import { X, Building2 } from 'lucide-react';

// ============================================================================
// ADD FLOOR MODAL
// ============================================================================

interface AddFloorModalProps {
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
  existingFloorNames?: string[]; // Add prop for client-side validation
}

export function AddFloorModal({ onSubmit, onClose, existingFloorNames = [] }: AddFloorModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    setName('');
    setError('');
    setLoading(false);
  }, []); // Only reset on mount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = name.trim();
    
    console.log('[AddFloorModal] Input:', name);
    console.log('[AddFloorModal] Trimmed:', trimmedName);
    console.log('[AddFloorModal] Existing floors:', existingFloorNames);
    
    if (!trimmedName) {
      setError('Please enter a floor name');
      return;
    }

    // Client-side duplicate check (case-insensitive) - use current prop value
    const duplicate = existingFloorNames.find(
      existing => existing && existing.toLowerCase() === trimmedName.toLowerCase()
    );
    
    console.log('[AddFloorModal] Duplicate found?', duplicate);
    
    if (duplicate) {
      setError(`A floor named "${duplicate}" already exists`);
      return;
    }

    // Clear any previous error
    setError('');

    try {
      setLoading(true);
      await onSubmit(trimmedName);
      // onSubmit will close the modal on success
    } catch (err: any) {
      setError(err.message || 'Failed to create floor');
      setLoading(false); // Keep modal open on error
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-600" />
            Add Floor
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Floor Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(''); // Clear error when user types
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
                if (e.key === 'Escape') {
                  onClose();
                }
              }}
              placeholder="e.g., Second Floor, Basement, Attic"
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 ${
                error ? 'border-red-300 bg-red-50 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
              autoFocus
              disabled={loading}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
            >
              {loading ? 'Creating...' : 'Add Floor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// ADD ROOM MODAL
// ============================================================================

interface AddRoomModalProps {
  floorId: string;
  onSubmit: (name: string, roomType: string) => Promise<void>;
  onClose: () => void;
}

export function AddRoomModal({ floorId, onSubmit, onClose }: AddRoomModalProps) {
  const [name, setName] = useState('');
  const [roomType, setRoomType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const roomTypes = [
    'kitchen',
    'bathroom',
    'bedroom',
    'living_room',
    'dining_room',
    'office',
    'laundry',
    'garage',
    'hallway',
    'other',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Room name is required');
      return;
    }

    if (!roomType) {
      setError('Room type is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSubmit(name.trim(), roomType);
    } catch (err: any) {
      setError(err.message || 'Failed to create room');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Add Room</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Room Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Master Bedroom, Guest Bathroom"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Room Type</label>
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              disabled={loading}
            >
              <option value="">Select room type</option>
              {roomTypes.map(type => (
                <option key={type} value={type}>
                  {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !roomType}
              className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// ADD TARGET MODAL
// ============================================================================

interface AddTargetModalProps {
  roomId: string;
  onSubmit: (name: string, targetType: string) => Promise<void>;
  onClose: () => void;
}

export function AddTargetModal({ roomId, onSubmit, onClose }: AddTargetModalProps) {
  const [name, setName] = useState('');
  const [targetType, setTargetType] = useState('surface');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const targetTypes = ['surface', 'appliance', 'fixture', 'furniture', 'other'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Target name is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSubmit(name.trim(), targetType);
    } catch (err: any) {
      setError(err.message || 'Failed to create target');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Add Target</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Target Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Counter, Sink, Window"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Target Type</label>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              disabled={loading}
            >
              {targetTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Target'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// ADD ACTION MODAL
// ============================================================================

interface AddActionModalProps {
  targetId: string;
  onSubmit: (name: string, description?: string) => Promise<void>;
  onClose: () => void;
}

export function AddActionModal({ targetId, onSubmit, onClose }: AddActionModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const actionSuggestions = [
    'Wipe Down',
    'Sweep',
    'Mop',
    'Dust',
    'Sanitize',
    'Polish',
    'Vacuum',
    'Clean',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Action name is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSubmit(name.trim(), description.trim() || undefined);
    } catch (err: any) {
      setError(err.message || 'Failed to create action');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Add Action</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Action Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Wipe Down, Sanitize"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              autoFocus
              disabled={loading}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {actionSuggestions.map(suggestion => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setName(suggestion)}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  disabled={loading}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Specific instructions for this action..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              rows={3}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Action'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// ADD TOOL MODAL
// ============================================================================

interface AddToolModalProps {
  actionId: string;
  onSubmit: (toolName: string) => Promise<void>;
  onClose: () => void;
}

export function AddToolModal({ actionId, onSubmit, onClose }: AddToolModalProps) {
  const [toolName, setToolName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toolSuggestions = [
    'Microfiber Cloth',
    'Spray Bottle',
    'Broom',
    'Mop',
    'Vacuum',
    'Bucket',
    'Sponge',
    'Gloves',
    'All-Purpose Cleaner',
    'Glass Cleaner',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!toolName.trim()) {
      setError('Tool name is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSubmit(toolName.trim());
    } catch (err: any) {
      setError(err.message || 'Failed to add tool');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Add Tool</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Tool Name</label>
            <input
              type="text"
              value={toolName}
              onChange={(e) => setToolName(e.target.value)}
              placeholder="e.g., Microfiber Cloth, Mop"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              autoFocus
              disabled={loading}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {toolSuggestions.map(suggestion => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setToolName(suggestion)}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  disabled={loading}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !toolName.trim()}
              className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Tool'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


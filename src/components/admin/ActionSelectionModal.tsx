'use client';

import { useState, useEffect } from 'react';
import { formatDisplayText } from '@/constants/taskHierarchy';
import { getValidActions } from '@/lib/constants/actionMap';

interface ActionSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: string) => void;
  selectedRoom: any;
  selectedTarget: any;
}

export default function ActionSelectionModal({ 
  isOpen, 
  onClose, 
  onSelectAction, 
  selectedRoom,
  selectedTarget
}: ActionSelectionModalProps) {
  const [filteredActions, setFilteredActions] = useState<string[]>([]);

  // Filter actions based on room + target
  useEffect(() => {
    console.log('===== ACTION MODAL DEBUG =====');
    console.log('selectedRoom:', selectedRoom);
    console.log('selectedTarget:', selectedTarget);
    
    if (selectedRoom && selectedTarget) {
      // Extract room name - handle different data structures
      const roomName = selectedRoom.name || selectedRoom.type || selectedRoom.room_type_name || selectedRoom;
      const roomKey = typeof roomName === 'string' 
        ? roomName.toLowerCase().replace(/\s+/g, '_')
        : '';
      
      // Extract target name - handle different data structures
      const targetName = selectedTarget.name || selectedTarget.type || selectedTarget.target_type_name || selectedTarget;
      const targetKey = typeof targetName === 'string'
        ? targetName.toLowerCase().replace(/\s+/g, '_')
        : '';
      
      console.log('Extracted roomKey:', roomKey);
      console.log('Extracted targetKey:', targetKey);
      
      const validActions = getValidActions(roomKey, targetKey);
      console.log('Valid actions returned:', validActions);
      
      // Extract action names from ActionDefinition objects
      const actionNames = validActions.map(action => action.name);
      setFilteredActions(actionNames);
    } else {
      setFilteredActions([]);
    }
  }, [selectedRoom, selectedTarget]);

  if (!isOpen) return null;

  const handleActionClick = (action: string) => {
    onSelectAction(action);
    onClose();
  };

  const roomDisplayName = selectedRoom?.name || selectedRoom?.type || selectedRoom || '';
  const targetDisplayName = selectedTarget?.name || selectedTarget?.type || selectedTarget || '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Select Action Type</h2>
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none p-2"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {selectedRoom && selectedTarget && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Showing actions for:{' '}
                <span className="font-semibold">
                  {formatDisplayText(roomDisplayName)}
                </span>
                {' > '}
                <span className="font-semibold">
                  {formatDisplayText(targetDisplayName)}
                </span>
              </p>
            </div>
          )}
        </div>

        <div className="p-6">
          {filteredActions.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {filteredActions.map((action) => (
                <button
                  key={action}
                  onClick={() => handleActionClick(action)}
                  className="px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center font-medium"
                >
                  {formatDisplayText(action)}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No actions available for this combination.</p>
              <p className="text-sm mt-2">Please select a room and target first.</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}




'use client';

import { useState, useEffect } from 'react';
import { formatDisplayText } from '@/constants/taskHierarchy';
import { getToolsForActionContext } from '@/lib/constants/actionMap';
import { getToolsForAction } from '@/lib/constants/toolPresets';

interface ToolSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (tool: string) => void;
  onSkip: () => void;
  selectedRoom: any;
  selectedTarget: any;
  selectedAction: any;
}

export default function ToolSelectionModal({ 
  isOpen, 
  onClose, 
  onSelectTool,
  onSkip,
  selectedRoom,
  selectedTarget,
  selectedAction
}: ToolSelectionModalProps) {
  const [availableTools, setAvailableTools] = useState<string[]>([]);

  // Filter tools based on room + target + action
  useEffect(() => {
    console.log('===== TOOL MODAL DEBUG =====');
    console.log('selectedRoom:', selectedRoom);
    console.log('selectedTarget:', selectedTarget);
    console.log('selectedAction:', selectedAction);
    
    if (selectedRoom && selectedTarget && selectedAction) {
      // Extract names and convert to keys
      const roomName = selectedRoom.name || selectedRoom.type || selectedRoom.room_type_name || selectedRoom;
      const roomKey = typeof roomName === 'string'
        ? roomName.toLowerCase().replace(/\s+/g, '_')
        : '';
      
      const targetName = selectedTarget.name || selectedTarget.type || selectedTarget.target_type_name || selectedTarget;
      const targetKey = typeof targetName === 'string'
        ? targetName.toLowerCase().replace(/\s+/g, '_')
        : '';
      
      const actionName = selectedAction.name || selectedAction.type || selectedAction.action_type_name || selectedAction;
      const actionKey = typeof actionName === 'string'
        ? actionName.toLowerCase().replace(/\s+/g, '_')
        : '';
      
      console.log('Tool lookup:', { roomKey, targetKey, actionKey });
      
      // Try to get tools from action map first (context-aware)
      let validTools = getToolsForActionContext(roomKey, targetKey, actionName);
      
      // Fallback to action-based presets if no context tools found
      if (validTools.length === 0) {
        validTools = getToolsForAction(actionName);
      }
      
      console.log('Valid tools returned:', validTools);
      
      setAvailableTools(validTools);
    } else {
      setAvailableTools([]);
    }
  }, [selectedRoom, selectedTarget, selectedAction]);

  if (!isOpen) return null;

  const handleToolClick = (tool: string) => {
    onSelectTool(tool);
    onClose();
  };

  const handleSkip = () => {
    onSkip();
    onClose();
  };

  const roomDisplayName = selectedRoom?.name || selectedRoom?.type || selectedRoom || '';
  const targetDisplayName = selectedTarget?.name || selectedTarget?.type || selectedTarget || '';
  const actionDisplayName = selectedAction?.name || selectedAction?.type || selectedAction || '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Select Tool</h2>
              <p className="text-sm text-gray-500 mt-1">(Optional)</p>
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none p-2"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {selectedRoom && selectedTarget && selectedAction && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">
                  {formatDisplayText(roomDisplayName)}
                </span>
                {' > '}
                <span className="font-semibold">
                  {formatDisplayText(targetDisplayName)}
                </span>
                {' > '}
                <span className="font-semibold">
                  {formatDisplayText(actionDisplayName)}
                </span>
              </p>
            </div>
          )}
        </div>

        <div className="p-6">
          {availableTools.length > 0 ? (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Select the tool you used (or skip if not applicable)
              </p>
              <div className="grid grid-cols-2 gap-3">
                {availableTools.map((tool) => (
                  <button
                    key={tool}
                    onClick={() => handleToolClick(tool)}
                    className="px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left font-medium"
                  >
                    {tool}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No specific tools needed for this task.</p>
              <p className="text-sm mt-2">You can skip this step.</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 space-y-3">
          <button
            onClick={handleSkip}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium"
          >
            Skip Tool Selection
          </button>
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




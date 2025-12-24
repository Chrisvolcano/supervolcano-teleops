'use client';

import { useState, useEffect } from 'react';
import { X, Folder, FolderOpen, ChevronRight, ChevronDown, Loader2, HardDrive, Check, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface DriveFolder {
  id: string;
  name: string;
  hasChildren: boolean;
  isSharedDrive?: boolean;
}

interface DriveFolderPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (folderId: string, folderName: string, sourceName: string) => void;
}

export function DriveFolderPicker({ isOpen, onClose, onSelect }: DriveFolderPickerProps) {
  const { getIdToken } = useAuth();
  const [step, setStep] = useState<'connect' | 'browse' | 'confirm'>('connect');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, DriveFolder[]>>({});
  const [loadingFolders, setLoadingFolders] = useState<Record<string, boolean>>({});
  const [selectedFolder, setSelectedFolder] = useState<{ id: string; name: string } | null>(null);
  const [sourceName, setSourceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);
  const [existingSources, setExistingSources] = useState<Array<{ folderId: string; name: string; parentChain?: string[] | null }>>([]);

  // Check for existing OAuth token on mount
  useEffect(() => {
    if (isOpen) {
      checkExistingAuth();
    }
  }, [isOpen]);

  async function checkExistingAuth() {
    try {
      const token = await getIdToken();
      if (!token) return;
      
      const response = await fetch('/api/admin/drive/check-auth', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.accessToken) {
          setAccessToken(data.accessToken);
          setStep('browse');
          loadRootFolders(data.accessToken);
        }
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    }
  }

  async function handleConnect() {
    setLoading(true);
    setError(null);
    
    try {
      const token = await getIdToken();
      if (!token) throw new Error('Not authenticated');
      
      // Get OAuth URL
      const response = await fetch('/api/admin/drive/auth', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Failed to get auth URL');
      const { authUrl } = await response.json();
      
      // Open popup
      const popup = window.open(authUrl, 'google-auth', 'width=500,height=600');
      
      // Listen for callback
      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          popup?.close();
          
          const { accessToken: newToken } = event.data;
          setAccessToken(newToken);
          setStep('browse');
          await loadRootFolders(newToken);
        } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
          window.removeEventListener('message', handleMessage);
          popup?.close();
          setError(event.data.error || 'Authentication failed');
        }
      };
      
      window.addEventListener('message', handleMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  }

  async function loadRootFolders(token: string) {
    setLoading(true);
    try {
      const idToken = await getIdToken();
      const response = await fetch('/api/admin/drive/folders?parentId=root', {
        headers: { 
          'Authorization': `Bearer ${idToken}`,
          'X-Drive-Token': token,
        },
      });
      
      if (!response.ok) throw new Error('Failed to load folders');
      const data = await response.json();
      setFolders(data.folders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  }

  async function loadSubfolders(parentId: string) {
    if (!accessToken) return;
    if (expandedFolders[parentId]) {
      // Already loaded, just toggle
      setExpandedFolders(prev => {
        const newState = { ...prev };
        delete newState[parentId];
        return newState;
      });
      return;
    }
    
    setLoadingFolders(prev => ({ ...prev, [parentId]: true }));
    
    try {
      const idToken = await getIdToken();
      const response = await fetch(`/api/admin/drive/folders?parentId=${parentId}`, {
        headers: { 
          'Authorization': `Bearer ${idToken}`,
          'X-Drive-Token': accessToken,
        },
      });
      
      if (!response.ok) throw new Error('Failed to load subfolders');
      const data = await response.json();
      setExpandedFolders(prev => ({ ...prev, [parentId]: data.folders || [] }));
    } catch (err) {
      console.error('Failed to load subfolders:', err);
    } finally {
      setLoadingFolders(prev => ({ ...prev, [parentId]: false }));
    }
  }

  async function handleSelectFolder(folder: DriveFolder) {
    setSelectedFolder({ id: folder.id, name: folder.name });
    setSourceName(folder.name);
    setOverlapWarning(null);
    
    // Fetch existing sources and check for overlaps
    await checkForOverlaps(folder.id);
    
    setStep('confirm');
  }

  async function checkForOverlaps(newFolderId: string) {
    if (!accessToken) return;
    
    try {
      const idToken = await getIdToken();
      if (!idToken) return;

      // Fetch existing sources
      const sourcesResponse = await fetch('/api/admin/data-intelligence/drive-sync', {
        headers: { 'Authorization': `Bearer ${idToken}` },
      });
      
      if (sourcesResponse.ok) {
        const { sources } = await sourcesResponse.json();
        setExistingSources(sources || []);
        
        // Get parent chain for the new folder
        const parentChain = await getParentChainForFolder(newFolderId);
        
        // Check if this folder is a parent of existing sources
        const existingChildren = sources.filter((s: any) => 
          s.parentChain?.includes(newFolderId)
        );
        
        if (existingChildren.length > 0) {
          const childNames = existingChildren.map((s: any) => s.name).join(', ');
          setOverlapWarning(
            `This folder contains ${existingChildren.length} existing source${existingChildren.length > 1 ? 's' : ''} (${childNames}). Their videos will be counted under this parent.`
          );
          return;
        }
        
        // Check if this folder is a child of existing sources
        const existingParents = sources.filter((s: any) => 
          parentChain.includes(s.folderId)
        );
        
        if (existingParents.length > 0) {
          const parentNames = existingParents.map((s: any) => s.name).join(', ');
          setOverlapWarning(
            `This folder is inside "${parentNames}". Its videos are already being counted.`
          );
          return;
        }
      }
    } catch (err) {
      console.error('Failed to check for overlaps:', err);
      // Don't block the user if we can't check overlaps
    }
  }

  async function getParentChainForFolder(folderId: string): Promise<string[]> {
    if (!accessToken) return [];
    
    const parents: string[] = [];
    let currentId = folderId;
    
    try {
      while (currentId) {
        try {
          const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${currentId}?fields=parents&supportsAllDrives=true`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            }
          );
          
          if (!response.ok) break;
          
          const file = await response.json();
          const parentId = file.parents?.[0];
          
          if (parentId && parentId !== 'root') {
            parents.push(parentId);
            currentId = parentId;
          } else {
            break;
          }
        } catch {
          break;
        }
      }
    } catch (err) {
      console.error('Failed to get parent chain:', err);
    }
    
    return parents;
  }

  function handleConfirm() {
    if (selectedFolder && sourceName.trim()) {
      onSelect(selectedFolder.id, selectedFolder.name, sourceName.trim());
      handleClose();
    }
  }

  function handleClose() {
    setStep('connect');
    setAccessToken(null);
    setFolders([]);
    setExpandedFolders({});
    setSelectedFolder(null);
    setSourceName('');
    setError(null);
    setOverlapWarning(null);
    setExistingSources([]);
    onClose();
  }

  function renderFolder(folder: DriveFolder, depth: number = 0) {
    const isExpanded = expandedFolders[folder.id];
    const isLoading = loadingFolders[folder.id];
    const isSelected = selectedFolder?.id === folder.id;
    
    return (
      <div key={folder.id}>
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors ${
            isSelected 
              ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400' 
              : 'hover:bg-gray-100 dark:hover:bg-[#1f1f1f]'
          }`}
          style={{ paddingLeft: `${12 + depth * 20}px` }}
        >
          {folder.hasChildren && (
            <button
              onClick={(e) => { e.stopPropagation(); loadSubfolders(folder.id); }}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-[#2a2a2a] rounded"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              ) : isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
          )}
          {!folder.hasChildren && <div className="w-5" />}
          
          <div 
            className="flex-1 flex items-center gap-2"
            onClick={() => handleSelectFolder(folder)}
          >
            {folder.isSharedDrive ? (
              <Users className="w-5 h-5 text-blue-500" />
            ) : isExpanded ? (
              <FolderOpen className="w-5 h-5 text-orange-500" />
            ) : (
              <Folder className="w-5 h-5 text-orange-500" />
            )}
            <span className="text-sm text-gray-900 dark:text-white truncate">{folder.name}</span>
          </div>
          
          {isSelected && <Check className="w-4 h-4 text-orange-500" />}
        </div>
        
        {isExpanded && expandedFolders[folder.id]?.map(child => renderFolder(child, depth + 1))}
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      
      <div className="relative bg-white dark:bg-[#141414] rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#1f1f1f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {step === 'connect' && 'Connect Google Drive'}
                {step === 'browse' && 'Select Folder'}
                {step === 'confirm' && 'Confirm Selection'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {step === 'connect' && 'Sign in to access your folders'}
                {step === 'browse' && 'Choose a folder to sync'}
                {step === 'confirm' && 'Name this data source'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#1f1f1f] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          {step === 'connect' && (
            <div className="text-center py-8">
              <HardDrive className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Connect your Google Drive to sync training data folders.
              </p>
              <button
                onClick={handleConnect}
                disabled={loading}
                className="inline-flex items-center gap-3 px-6 py-3 bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-[#2a2a2a] rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                <span className="text-gray-900 dark:text-white font-medium">
                  {loading ? 'Connecting...' : 'Continue with Google'}
                </span>
              </button>
            </div>
          )}
          
          {step === 'browse' && (
            <div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
              ) : folders.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No folders found
                </div>
              ) : (
                <div className="space-y-1">
                  {folders.map(folder => renderFolder(folder))}
                </div>
              )}
            </div>
          )}
          
          {step === 'confirm' && selectedFolder && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-[#0a0a0a] rounded-xl">
                <div className="flex items-center gap-3">
                  <Folder className="w-8 h-8 text-orange-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedFolder.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Selected folder</p>
                  </div>
                </div>
              </div>
              
              {overlapWarning && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-lg text-sm text-yellow-700 dark:text-yellow-400">
                  {overlapWarning}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Data Source Name
                </label>
                <input
                  type="text"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder="e.g., Training Videos Q4"
                  className="w-full px-4 py-3 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#2a2a2a] rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  This name will appear in your Data Sources list
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        {step !== 'connect' && (
          <div className="p-6 border-t border-gray-200 dark:border-[#1f1f1f] flex items-center justify-between">
            <button
              onClick={() => setStep(step === 'confirm' ? 'browse' : 'connect')}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1f1f1f] rounded-lg transition-colors"
            >
              Back
            </button>
            
            {step === 'confirm' && (
              <button
                onClick={handleConfirm}
                disabled={!sourceName.trim()}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add & Sync
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


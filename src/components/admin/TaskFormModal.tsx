'use client'

import { useState, useRef } from 'react';
import { X, Upload, Video, Loader2, Trash2, Plus, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFirebaseUpload } from '@/lib/hooks/useFirebaseUpload';

interface TaskFormModalProps {
  locationId: string;
  locationName?: string;
  partnerOrgId?: string;
  task?: any;
  onClose: () => void;
  onSave: () => void;
}

export default function TaskFormModal({ locationId, locationName, partnerOrgId, task, onClose, onSave }: TaskFormModalProps) {
  const { getIdToken, claims } = useAuth();
  const { uploadFile, uploading, progress, error: uploadError } = useFirebaseUpload();
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    category: task?.category || '',
    estimatedDuration: task?.estimated_duration_minutes || '',
    priority: task?.priority || 'medium',
  });
  const [saving, setSaving] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [uploadedMedia, setUploadedMedia] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    
    try {
      console.log('🔍 TASK FORM: Starting task submission...');
      
      const token = await getIdToken();
      if (!token) {
        console.error('❌ TASK FORM: Not authenticated');
        alert('Not authenticated');
        return;
      }

      const payload = {
        locationId,
        locationName: locationName || '',
        partnerOrgId: partnerOrgId || 'demo-org',
        title: formData.title,
        description: formData.description,
        category: formData.category,
        estimatedDurationMinutes: formData.estimatedDuration ? parseInt(formData.estimatedDuration) : null,
        priority: formData.priority,
      };

      console.log('🔍 TASK FORM: Submitting task with payload:', payload);

      // 1. Create/update task
      const taskResponse = await fetch(
        task ? `/api/admin/tasks/${task.id}` : '/api/admin/tasks',
        {
          method: task ? 'PATCH' : 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify(payload),
        }
      );
      
      console.log('🔍 TASK FORM: Response status:', taskResponse.status);
      
      const taskData = await taskResponse.json();
      console.log('🔍 TASK FORM: Response data:', taskData);
      
      if (!taskData.success) {
        console.error('❌ TASK FORM: Task save failed:', taskData.error);
        alert('Failed to save task: ' + (taskData.error || 'Unknown error'));
        return;
      }
      
      const jobId = task?.id || taskData.id;
      console.log('✅ TASK FORM: Task saved successfully with ID:', jobId);
      
      // 2. Upload media files directly to Firebase Storage
      if (mediaFiles.length > 0) {
        console.log(`Uploading ${mediaFiles.length} media files...`);
        const uploadedUrls: string[] = [];
        
        for (let i = 0; i < mediaFiles.length; i++) {
          const file = mediaFiles[i];
          console.log(`Uploading file ${i + 1}/${mediaFiles.length}: ${file.name}`);
          
          try {
            // Upload directly to Firebase Storage
            const timestamp = Date.now();
            const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const path = `media/${locationId}/${jobId}/${timestamp}-${sanitizedFileName}`;
            
            const storageUrl = await new Promise<string>((resolve, reject) => {
              uploadFile(file, path, (url) => {
                resolve(url);
              }).catch(reject);
            });
            
            if (!storageUrl) {
              throw new Error('Upload failed to return URL');
            }
            
            console.log('File uploaded to:', storageUrl);
            uploadedUrls.push(storageUrl);
            
            // Save metadata to Firestore via API
            console.log('Saving metadata to Firestore...');
            const metadataResponse = await fetch('/api/admin/media/metadata', {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' 
              },
              body: JSON.stringify({
                jobId, // This is actually the jobId (Firestore "tasks")
                locationId,
                mediaType: file.type.startsWith('video/') ? 'video' : 'image',
                storageUrl,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type,
              }),
            });
            
            const metadataData = await metadataResponse.json();
            if (metadataData.success) {
              console.log('Media metadata saved:', metadataData.id);
              setUploadedMedia(prev => [...prev, { 
                id: metadataData.id,
                url: storageUrl, 
                fileName: file.name 
              }]);
            } else {
              console.error('Failed to save metadata:', metadataData.error);
              alert(`Warning: File uploaded but metadata save failed: ${metadataData.error}`);
            }
          } catch (error: any) {
            console.error(`Failed to upload ${file.name}:`, error);
            alert(`Failed to upload ${file.name}: ${error.message || 'Unknown error'}`);
            // Continue with other files
          }
        }
        
        console.log(`Successfully uploaded ${uploadedUrls.length}/${mediaFiles.length} files`);
      }
      
      console.log('✅ TASK FORM: All operations complete, calling onSave callback');
      alert('Task saved successfully!');
      onSave();
    } catch (error: any) {
      console.error('❌ TASK FORM: Failed to save task:', error);
      console.error('❌ TASK FORM: Error details:', {
        message: error.message,
        stack: error.stack,
      });
      alert('Failed to save task: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }
  
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      // Check file sizes (500MB limit)
      const oversizedFiles = newFiles.filter(f => f.size > 500 * 1024 * 1024);
      
      if (oversizedFiles.length > 0) {
        alert(`Some files are too large (max 500MB): ${oversizedFiles.map(f => f.name).join(', ')}`);
        return;
      }
      
      setMediaFiles([...mediaFiles, ...newFiles]);
    }
  }
  
  function removeFile(index: number) {
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {task ? 'Edit Task' : 'Add New Task'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Create tasks that will generate moments for robot learning
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
              placeholder="e.g., Clean Kitchen"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
              placeholder="Detailed description of the task..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
          
          {/* Category & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select category</option>
                <option value="cleaning">Cleaning</option>
                <option value="maintenance">Maintenance</option>
                <option value="preparation">Preparation</option>
                <option value="inspection">Inspection</option>
                <option value="restocking">Restocking</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.estimatedDuration}
                onChange={(e) => setFormData({...formData, estimatedDuration: e.target.value})}
                placeholder="30"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <div className="flex gap-3">
              {['low', 'medium', 'high'].map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => setFormData({...formData, priority})}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                    formData.priority === priority
                      ? priority === 'high' ? 'border-red-500 bg-red-50 text-red-700' :
                        priority === 'medium' ? 'border-yellow-500 bg-yellow-50 text-yellow-700' :
                        'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          {/* Media Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Media (Videos & Images)
            </label>
            <div className="space-y-3">
              {/* Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="h-5 w-5" />
                <span>Upload Videos or Images (up to 500MB each)</span>
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {/* Upload Progress */}
              {uploading && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    <span className="text-sm font-medium text-blue-900">
                      Uploading to Firebase Storage... {progress}%
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
              
              {/* Error Display */}
              {uploadError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-900">Upload failed: {uploadError}</p>
                </div>
              )}
              
              {/* File List */}
              {mediaFiles.length > 0 && (
                <div className="space-y-2">
                  {mediaFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          file.type.startsWith('video/') ? 'bg-purple-100' : 'bg-blue-100'
                        }`}>
                          {file.type.startsWith('video/') ? (
                            <Video className="h-5 w-5 text-purple-600" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        disabled={uploading || saving}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        aria-label="Remove file"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Uploaded Files */}
              {uploadedMedia.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-700">✓ Uploaded successfully:</p>
                  {uploadedMedia.map((media, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-900">{media.fileName || 'File uploaded'}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <p className="text-xs text-gray-500">
                Videos upload directly to Firebase Storage (no size limit). Large files may take a few minutes.
              </p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || uploading}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading || !formData.title}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving || uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {uploading ? `Uploading... ${progress}%` : 'Saving...'}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  {task ? 'Update Task' : 'Create Task'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


'use client'

import { useState, useRef } from 'react';
import { X, Upload, Video, Loader2, Trash2, Plus, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface TaskFormModalProps {
  locationId: string;
  task?: any;
  onClose: () => void;
  onSave: () => void;
}

export default function TaskFormModal({ locationId, task, onClose, onSave }: TaskFormModalProps) {
  const { getIdToken } = useAuth();
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    category: task?.category || '',
    estimatedDuration: task?.estimated_duration_minutes || '',
    priority: task?.priority || 'medium',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    
    try {
      const token = await getIdToken();
      if (!token) {
        alert('Not authenticated');
        return;
      }

      // 1. Create/update task
      const taskResponse = await fetch(
        task ? `/api/admin/tasks/${task.id}` : '/api/admin/tasks',
        {
          method: task ? 'PATCH' : 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({
            locationId,
            title: formData.title,
            description: formData.description,
            category: formData.category,
            estimatedDurationMinutes: formData.estimatedDuration ? parseInt(formData.estimatedDuration) : null,
            priority: formData.priority,
          }),
        }
      );
      
      const taskData = await taskResponse.json();
      
      if (!taskData.success) {
        alert('Failed to save task: ' + (taskData.error || 'Unknown error'));
        return;
      }
      
      const jobId = task?.id || taskData.id; // This is actually a job ID (Firestore "tasks" = SQL "jobs")
      
      // 2. Upload media files if any
      if (mediaFiles.length > 0) {
        setUploadingMedia(true);
        await uploadMediaFiles(jobId, locationId, token);
      }
      
      onSave();
    } catch (error) {
      console.error('Failed to save task:', error);
      alert('Failed to save task');
    } finally {
      setSaving(false);
      setUploadingMedia(false);
    }
  }
  
  async function uploadMediaFiles(jobId: string, locationId: string, token: string) {
    for (const file of mediaFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('jobId', jobId); // Changed from taskId - media is linked to jobs
        formData.append('locationId', locationId);
        formData.append('mediaType', file.type.startsWith('video/') ? 'video' : 'image');
        
        const response = await fetch('/api/admin/media/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });
        
        if (!response.ok) {
          // Handle 413 errors specifically
          if (response.status === 413) {
            let errorMessage = 'File too large for upload';
            try {
              const errorText = await response.text();
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.error || errorMessage;
            } catch {
              // If response is not JSON, use default message
            }
            alert(`Upload failed: ${errorMessage}`);
            continue;
          }
          
          const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
          alert(`Upload failed: ${errorData.error || 'Unknown error'}`);
          continue;
        }
        
        const data = await response.json();
        
        if (!data.success) {
          console.error('Failed to upload media:', data.error);
          alert(`Upload failed: ${data.error || 'Unknown error'}`);
        }
      } catch (error: any) {
        console.error('Error uploading media:', error);
        alert(`Upload error: ${error.message || 'Failed to upload file'}`);
      }
    }
  }
  
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setMediaFiles([...mediaFiles, ...Array.from(e.target.files)]);
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
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Upload className="h-5 w-5" />
                <span>Upload Videos or Images</span>
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              
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
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Remove file"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <p className="text-xs text-gray-500">
                Upload videos showing how to perform this task. These will be used for robot learning and moment extraction.
              </p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || uploadingMedia}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadingMedia || !formData.title}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving || uploadingMedia ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {uploadingMedia ? 'Uploading media...' : 'Saving...'}
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


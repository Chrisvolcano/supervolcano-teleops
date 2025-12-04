'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Video, Image, MapPin, FileText, CheckCircle, Trash2, Edit2, Upload, Loader2, Play, Film } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { firestore, storage } from '@/lib/firebaseClient';
import type { ReferenceMediaItem } from '@/types/location-intelligence';
import toast from 'react-hot-toast';

interface LocationReferenceMediaProps {
  locationId: string;
  referenceMedia: ReferenceMediaItem[];
  rooms: Array<{ id: string; name: string }>;
  onUpdate: () => void;
}

export default function LocationReferenceMedia({
  locationId,
  referenceMedia,
  rooms,
  onUpdate,
}: LocationReferenceMediaProps) {
  const { getIdToken, user, claims } = useAuth();
  const [selectedMedia, setSelectedMedia] = useState<ReferenceMediaItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMedia, setEditingMedia] = useState<ReferenceMediaItem | null>(null);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [existingMediaId, setExistingMediaId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [mediaType, setMediaType] = useState<'how_to' | 'reference' | 'location'>('location');
  const [roomId, setRoomId] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const mediaTypeLabels = {
    location: { label: 'Location', icon: MapPin, desc: 'Where something is' },
    how_to: { label: 'How-to', icon: FileText, desc: 'How to do something' },
    reference: { label: 'Reference', icon: CheckCircle, desc: 'What it should look like' },
  };

  const resetForm = () => {
    setFile(null);
    setExistingMediaId('');
    setDescription('');
    setMediaType('location');
    setRoomId('');
    setPreviewUrl(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ['video/mp4', 'video/mov', 'video/quicktime', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Invalid file type. Please upload MP4, MOV, JPG, PNG, or WebP.');
      return;
    }

    // Validate file size
    const maxSize = selectedFile.type.startsWith('video/') ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      toast.error(`File too large. Max size: ${selectedFile.type.startsWith('video/') ? '100MB' : '10MB'}`);
      return;
    }

    setFile(selectedFile);
    setExistingMediaId(''); // Clear existing media selection when new file is chosen

    // Create preview URL
    if (selectedFile.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleSave = async () => {
    if (!description.trim()) {
      toast.error('Description is required');
      return;
    }

    if (!file && !existingMediaId) {
      toast.error('Please upload a file or select existing media');
      return;
    }

    setUploading(true);

    try {
      const locationRef = doc(firestore, 'locations', locationId);
      const locationDoc = await getDoc(locationRef);

      if (!locationDoc.exists()) {
        throw new Error('Location not found');
      }

      let mediaUrl = '';
      let thumbnailUrl: string | undefined = undefined;
      let fileName = '';

      if (file) {
        // Upload new file
        const fileExt = file.name.split('.').pop();
        const fileNameSafe = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const storageRef = ref(storage, `locations/${locationId}/reference-media/${fileNameSafe}`);
        
        await uploadBytes(storageRef, file);
        mediaUrl = await getDownloadURL(storageRef);
        fileName = file.name;
      } else if (existingMediaId) {
        // Use existing media from location's media collection
        const mediaDoc = await getDoc(doc(firestore, 'media', existingMediaId));
        if (!mediaDoc.exists()) {
          throw new Error('Selected media not found');
        }
        const mediaData = mediaDoc.data();
        mediaUrl = mediaData.storageUrl || mediaData.url || '';
        thumbnailUrl = mediaData.thumbnailUrl || undefined;
        fileName = mediaData.fileName || 'unknown';
      }

      if (!mediaUrl) {
        throw new Error('Failed to get media URL');
      }

      const isVideo = file 
        ? file.type.startsWith('video/')
        : mediaUrl.includes('.mp4') || mediaUrl.includes('.mov') || mediaUrl.includes('video');

      const selectedRoom = rooms.find(r => r.id === roomId);
      const newMediaItem: ReferenceMediaItem = {
        id: editingMedia?.id || crypto.randomUUID(),
        url: mediaUrl,
        thumbnailUrl,
        fileName,
        type: isVideo ? 'video' : 'photo',
        mediaType,
        description: description.trim(),
        roomId: roomId || undefined,
        roomName: selectedRoom?.name,
        createdAt: editingMedia?.createdAt || new Date().toISOString(),
        createdBy: (claims as any)?.email || user?.email || 'unknown',
      };

      const currentMedia = locationDoc.data()?.intelligence?.referenceMedia || [];
      
      if (editingMedia) {
        // Update existing
        const updatedMedia = currentMedia.map((m: ReferenceMediaItem) =>
          m.id === editingMedia.id ? newMediaItem : m
        );
        await updateDoc(locationRef, {
          'intelligence.referenceMedia': updatedMedia,
          updatedAt: serverTimestamp(),
        });
        toast.success('Reference media updated');
      } else {
        // Add new
        await updateDoc(locationRef, {
          'intelligence.referenceMedia': arrayUnion(newMediaItem),
          updatedAt: serverTimestamp(),
        });
        toast.success('Reference media added');
      }

      resetForm();
      setShowAddModal(false);
      setEditingMedia(null);
      onUpdate();
    } catch (error: any) {
      console.error('Error saving reference media:', error);
      toast.error(error.message || 'Failed to save reference media');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (mediaId: string) => {
    if (!confirm('Are you sure you want to delete this reference media?')) return;

    try {
      const locationRef = doc(firestore, 'locations', locationId);
      const locationDoc = await getDoc(locationRef);

      if (!locationDoc.exists()) {
        throw new Error('Location not found');
      }

      const currentMedia = locationDoc.data()?.intelligence?.referenceMedia || [];
      const mediaItem = currentMedia.find((m: ReferenceMediaItem) => m.id === mediaId);

      // Delete from storage if we uploaded it
      if (mediaItem?.url && mediaItem.url.includes(`locations/${locationId}/reference-media/`)) {
        try {
          const storageRef = ref(storage, mediaItem.url);
          await deleteObject(storageRef);
        } catch (err) {
          console.warn('Failed to delete from storage:', err);
        }
      }

      const updatedMedia = currentMedia.filter((m: ReferenceMediaItem) => m.id !== mediaId);
      await updateDoc(locationRef, {
        'intelligence.referenceMedia': updatedMedia,
        updatedAt: serverTimestamp(),
      });

      toast.success('Reference media deleted');
      if (selectedMedia?.id === mediaId) {
        setSelectedMedia(null);
      }
      onUpdate();
    } catch (error: any) {
      console.error('Error deleting reference media:', error);
      toast.error(error.message || 'Failed to delete reference media');
    }
  };

  const handleEdit = (media: ReferenceMediaItem) => {
    setEditingMedia(media);
    setDescription(media.description);
    setMediaType(media.mediaType);
    setRoomId(media.roomId || '');
    setFile(null);
    setExistingMediaId('');
    setPreviewUrl(media.url);
    setShowAddModal(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Reference Media</h3>
          <p className="text-sm text-gray-500">Photos and videos showing location-specific knowledge</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingMedia(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Media
        </button>
      </div>

      {/* Media Grid */}
      {referenceMedia.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Film className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 mb-1">No reference media yet</p>
          <p className="text-sm text-gray-400 mb-4">Add photos and videos to help robots understand this location</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add First Media
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {referenceMedia.map((item) => {
            const typeInfo = mediaTypeLabels[item.mediaType];
            const TypeIcon = typeInfo.icon;

            return (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedMedia(item)}
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gray-100 flex items-center justify-center relative">
                  {item.type === 'video' ? (
                    <>
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt={item.description} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <Video className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="bg-white/90 rounded-full p-3">
                          <Play className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <img src={item.url} alt={item.description} className="w-full h-full object-cover" />
                  )}
                </div>

                {/* Content */}
                <div className="p-4 space-y-2">
                  <h4 className="font-medium text-gray-900 truncate">{item.description}</h4>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <TypeIcon className="w-4 h-4" />
                    <span>{typeInfo.label}</span>
                  </div>
                  {item.roomName && (
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="w-3 h-3" />
                      <span>{item.roomName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(item);
                      }}
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="flex-1 px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {selectedMedia && (
        <div
          className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setSelectedMedia(null)}
        >
          <div
            className="bg-white rounded-lg max-w-3xl w-full my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-lg pr-4">{selectedMedia.description}</h3>
              <button
                onClick={() => setSelectedMedia(null)}
                className="p-2 hover:bg-gray-100 rounded-full flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Media Player */}
            <div className="bg-black flex items-center justify-center">
              {selectedMedia.type === 'video' ? (
                <video
                  src={selectedMedia.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[60vh] object-contain"
                >
                  Your browser does not support video playback.
                </video>
              ) : (
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.description}
                  className="max-w-full max-h-[60vh] object-contain"
                />
              )}
            </div>

            {/* Metadata */}
            <div className="p-4 space-y-3 text-sm border-t">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-500">Type:</span>{' '}
                  <span className="font-medium">
                    {mediaTypeLabels[selectedMedia.mediaType].label}
                  </span>
                </div>
                {selectedMedia.roomName && (
                  <div>
                    <span className="text-gray-500">Room:</span>{' '}
                    <span className="font-medium">{selectedMedia.roomName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => handleDelete(selectedMedia.id)}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  handleEdit(selectedMedia);
                  setSelectedMedia(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            if (!uploading) {
              resetForm();
              setShowAddModal(false);
              setEditingMedia(null);
            }
          }}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-lg">
                {editingMedia ? 'Edit Reference Media' : 'Add Reference Media'}
              </h3>
              <button
                onClick={() => {
                  if (!uploading) {
                    resetForm();
                    setShowAddModal(false);
                    setEditingMedia(null);
                  }
                }}
                disabled={uploading}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload File *
                </label>
                {!file && !existingMediaId && (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                    <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 mb-1">
                      Drag and drop file here, or click to browse
                    </p>
                    <p className="text-xs text-gray-400 mb-4">(MP4, MOV, JPG, PNG, WebP)</p>
                    <input
                      type="file"
                      accept="video/mp4,video/mov,video/quicktime,image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                    >
                      Choose File
                    </label>
                  </div>
                )}
                {file && (
                  <div className="border border-gray-300 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {previewUrl && file.type.startsWith('image/') && (
                        <img src={previewUrl} alt="Preview" className="w-16 h-16 object-cover rounded" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setFile(null);
                        setPreviewUrl(null);
                      }}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Where the vacuum cleaner is stored"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              {/* Media Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  What type of reference is this? *
                </label>
                <div className="space-y-2">
                  {(['location', 'how_to', 'reference'] as const).map((type) => {
                    const typeInfo = mediaTypeLabels[type];
                    const Icon = typeInfo.icon;
                    return (
                      <label
                        key={type}
                        className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                          mediaType === type
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="mediaType"
                          value={type}
                          checked={mediaType === type}
                          onChange={() => setMediaType(type)}
                          className="mt-1"
                        />
                        <Icon className="w-5 h-5 text-gray-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{typeInfo.label}</div>
                          <div className="text-sm text-gray-500">{typeInfo.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Room Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room (optional)
                </label>
                <select
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => {
                  if (!uploading) {
                    resetForm();
                    setShowAddModal(false);
                    setEditingMedia(null);
                  }
                }}
                disabled={uploading}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={uploading || !description.trim() || (!file && !existingMediaId)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingMedia ? 'Update' : 'Save Reference Media'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


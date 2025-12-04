'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { auth, storage, db } from '@/lib/firebaseClient';
import { Video, Upload, CheckCircle, X } from 'lucide-react';

interface UploadedVideo {
  id: string;
  name: string;
  url: string;
  progress: number;
}

export default function UploadPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videos, setVideos] = useState<UploadedVideo[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        router.push('/get-started/auth');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    const locationId = sessionStorage.getItem('onboarding_location_id');
    if (!locationId) {
      router.push('/get-started/property');
      return;
    }

    setUploading(true);
    for (const file of Array.from(files)) {
      const videoId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const storagePath = `videos/${locationId}/${user.uid}/${videoId}.${file.name.split('.').pop()}`;

      // Add placeholder to list
      const tempVideo: UploadedVideo = {
        id: videoId,
        name: file.name,
        url: '',
        progress: 0,
      };
      setVideos((prev) => [...prev, tempVideo]);

      // Upload to Firebase Storage
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setVideos((prev) =>
            prev.map((v) => (v.id === videoId ? { ...v, progress } : v))
          );
        },
        (error) => {
          console.error('Upload error:', error);
          setVideos((prev) => prev.filter((v) => v.id !== videoId));
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          // Save to Firestore
          await addDoc(collection(db, 'media'), {
            userId: user.uid,
            locationId,
            organizationId: `owner:${user.uid}`,
            type: 'video',
            mediaType: 'video',
            mimeType: file.type,
            fileName: file.name,
            url: downloadURL,
            storageUrl: downloadURL,
            videoUrl: downloadURL,
            storagePath,
            fileSize: file.size,
            uploadedAt: new Date(),
            source: 'web_onboarding',
            aiStatus: 'pending',
            trainingStatus: 'pending',
          });

          setVideos((prev) =>
            prev.map((v) => (v.id === videoId ? { ...v, url: downloadURL, progress: 100 } : v))
          );
        }
      );
    }
    setUploading(false);
  };

  const removeVideo = (id: string) => {
    setVideos(videos.filter((v) => v.id !== id));
  };

  const handleContinue = () => {
    router.push('/get-started/invite');
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-8">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <span>Step 4 of 5</span>
        </div>
        <div className="h-1 bg-gray-200 rounded-full">
          <div className="h-1 bg-blue-600 rounded-full w-[80%]" />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload a walkthrough video</h1>
      <p className="text-gray-600 mb-6">
        Show cleaners exactly how you want things done. Walk through each room and point out details.
      </p>

      {/* Upload area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition mb-6"
      >
        <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <div className="font-medium text-gray-900 mb-1">Tap to record or upload</div>
        <div className="text-sm text-gray-500">MP4, MOV up to 500MB</div>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          capture="environment"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Uploaded videos */}
      {videos.length > 0 && (
        <div className="space-y-3 mb-6">
          {videos.map((video) => (
            <div key={video.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                {video.progress === 100 ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Upload className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{video.name}</div>
                {video.progress < 100 ? (
                  <div className="mt-1">
                    <div className="h-1 bg-gray-200 rounded-full">
                      <div
                        className="h-1 bg-blue-600 rounded-full transition-all"
                        style={{ width: `${video.progress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-green-600">Uploaded</div>
                )}
              </div>
              <button onClick={() => removeVideo(video.id)} className="p-1 hover:bg-gray-200 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="font-medium text-amber-800 mb-2">💡 Tips for a great video</div>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• Walk slowly through each room</li>
          <li>• Point out where items should go</li>
          <li>• Show how you like things organized</li>
          <li>• 2-5 minutes is ideal</li>
        </ul>
      </div>

      <div className="mt-auto space-y-3">
        <button
          onClick={handleContinue}
          disabled={uploading}
          className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
        >
          {videos.length > 0 ? 'Continue' : 'Skip for now'}
        </button>
      </div>
    </div>
  );
}


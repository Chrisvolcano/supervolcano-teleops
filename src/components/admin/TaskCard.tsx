'use client'

import { Edit2, Trash2, Video, Image as ImageIcon, Sparkles } from 'lucide-react';

interface TaskCardProps {
  task: any;
  onEdit: () => void;
  onDelete: () => void;
  onViewMoments: () => void;
}

export default function TaskCard({ task, onEdit, onDelete, onViewMoments }: TaskCardProps) {
  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-gray-900">{task.title}</h3>
            {task.category && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                {task.category}
              </span>
            )}
            {task.priority && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                task.priority === 'high' ? 'bg-red-100 text-red-700' :
                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {task.priority}
              </span>
            )}
          </div>
          
          {task.description && (
            <p className="text-sm text-gray-600 mb-3">{task.description}</p>
          )}
          
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
            {task.estimated_duration_minutes && (
              <span>~{task.estimated_duration_minutes} min</span>
            )}
            {task.moment_count > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewMoments();
                }}
                className="flex items-center gap-1 text-purple-600 hover:text-purple-700"
              >
                <Sparkles className="h-3 w-3" />
                {task.moment_count} moments
              </button>
            )}
            {task.media_count > 0 && (
              <span className="flex items-center gap-1">
                <Video className="h-3 w-3" />
                {task.media_count} media
              </span>
            )}
          </div>
          
          {/* Media Preview */}
          {task.media && task.media.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {task.media.slice(0, 4).map((mediaItem: any) => (
                <div
                  key={mediaItem.id}
                  className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-100"
                >
                  {mediaItem.mediaType === 'video' ? (
                    <video
                      src={mediaItem.storageUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={mediaItem.storageUrl}
                      alt={mediaItem.fileName || 'Media'}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                    <p className="text-[10px] text-white truncate">
                      {mediaItem.fileName || 'File'}
                    </p>
                  </div>
                </div>
              ))}
              {task.media.length > 4 && (
                <div className="w-20 h-20 rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                  +{task.media.length - 4} more
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            aria-label="Edit task"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}


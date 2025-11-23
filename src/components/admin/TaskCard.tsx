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
          
          <div className="flex items-center gap-4 text-xs text-gray-500">
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


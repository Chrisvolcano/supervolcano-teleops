'use client'

import { useState } from 'react';
import { taskCompletionSchema } from '@/lib/validation/schemas';
import { z } from 'zod';
import toast from 'react-hot-toast';

interface TaskCompletionModalProps {
  task: any;
  locationId: string;
  locationName: string;
  currentSession?: any; // Today's session at this location (if exists)
  onComplete: (data: any) => Promise<void>;
  onCancel: () => void;
}

export function TaskCompletionModal({ 
  task, 
  locationId,
  locationName,
  currentSession,
  onComplete, 
  onCancel 
}: TaskCompletionModalProps) {
  
  // Default end time to now
  const now = new Date();
  const nowString = now.toISOString().slice(0, 16);
  
  // Default start time to estimated duration before now
  const estimatedStart = new Date(now.getTime() - (task.estimatedDuration || 30) * 60000);
  const estimatedStartString = estimatedStart.toISOString().slice(0, 16);
  
  const [formData, setFormData] = useState({
    status: 'completed' as 'completed' | 'incomplete' | 'error',
    startedAt: estimatedStartString,
    completedAt: nowString,
    notes: '',
    issuesEncountered: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Calculate duration
  const actualDuration = Math.max(1, Math.floor(
    (new Date(formData.completedAt).getTime() - new Date(formData.startedAt).getTime()) / 60000
  ));
  
  const handleSubmit = async () => {
    setErrors({});
    
    try {
      // Validate with Zod
      const validationData = {
        status: formData.status,
        actualDuration,
        startedAt: new Date(formData.startedAt),
        completedAt: new Date(formData.completedAt),
        notes: formData.notes,
        issuesEncountered: formData.issuesEncountered
      };
      
      taskCompletionSchema.parse(validationData);
      
      setSubmitting(true);
      
      await onComplete({
        taskId: task.id,
        taskTitle: task.title,
        taskCategory: task.category || task.type || 'general',
        locationId: locationId,
        locationName: locationName,
        estimatedDuration: task.estimatedDuration,
        status: formData.status,
        startedAt: new Date(formData.startedAt),
        completedAt: new Date(formData.completedAt),
        actualDuration: actualDuration,
        notes: formData.notes,
        issuesEncountered: formData.issuesEncountered
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          if (issue.path.length > 0) {
            fieldErrors[issue.path[0] as string] = issue.message;
          }
        });
        setErrors(fieldErrors);
        // Show first error as toast
        if (error.issues.length > 0) {
          toast.error(error.issues[0].message);
        }
      } else {
        toast.error('Failed to submit completion. Please try again.');
      }
      setSubmitting(false);
    }
  };
  
  const isValid = actualDuration > 0 && 
    (formData.status === 'completed' || formData.issuesEncountered.trim().length > 0);
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-completion-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h3 id="task-completion-title" className="text-xl font-semibold text-slate-900">✅ Complete Task</h3>
            <p className="text-sm text-slate-600 mt-1">{task.title}</p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
        {/* Task Summary */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="font-semibold text-lg">{task.title}</p>
          <p className="text-sm text-slate-600 mt-1">📍 {locationName}</p>
          {task.estimatedDuration && (
            <p className="text-sm text-slate-600">⏱️ Estimated: {task.estimatedDuration} minutes</p>
          )}
        </div>
        
        {/* Session Context */}
        {currentSession && currentSession.totalTasks > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              📊 This will be task <strong>#{currentSession.totalTasks + 1}</strong> in today&apos;s session at this location
              ({currentSession.totalTasks} already completed)
            </p>
          </div>
        )}
        
        <div className="space-y-4">
          {/* Time Range */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h4 className="font-medium text-slate-900 mb-3">⏰ Task Timing</h4>
            
            <div className="space-y-3">
              <div>
                <label htmlFor="startedAt" className="block text-sm font-medium text-slate-700 mb-2">
                  When did you START this task? *
                </label>
                <input
                  id="startedAt"
                  type="datetime-local"
                  value={formData.startedAt}
                  onChange={(e) => {
                    setFormData({...formData, startedAt: e.target.value});
                    setErrors({...errors, startedAt: '', completedAt: ''});
                  }}
                  max={formData.completedAt}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow text-slate-900 placeholder-slate-400 ${
                    errors.startedAt || errors.completedAt ? 'border-red-300' : 'border-slate-300'
                  }`}
                  required
                  aria-required="true"
                  aria-invalid={errors.startedAt ? 'true' : 'false'}
                  aria-describedby={errors.startedAt ? 'startedAt-error' : undefined}
                />
                {errors.startedAt && (
                  <p id="startedAt-error" className="text-sm text-red-600 mt-1" role="alert">
                    {errors.startedAt}
                  </p>
                )}
              </div>
              
              <div>
                <label htmlFor="completedAt" className="block text-sm font-medium text-slate-700 mb-2">
                  When did you FINISH this task? *
                </label>
                <input
                  id="completedAt"
                  type="datetime-local"
                  value={formData.completedAt}
                  onChange={(e) => {
                    setFormData({...formData, completedAt: e.target.value});
                    setErrors({...errors, completedAt: ''});
                  }}
                  min={formData.startedAt}
                  max={nowString}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow text-slate-900 placeholder-slate-400 ${
                    errors.completedAt ? 'border-red-300' : 'border-slate-300'
                  }`}
                  required
                  aria-required="true"
                  aria-invalid={errors.completedAt ? 'true' : 'false'}
                  aria-describedby={errors.completedAt ? 'completedAt-error' : undefined}
                />
                {errors.completedAt && (
                  <p id="completedAt-error" className="text-sm text-red-600 mt-1" role="alert">
                    {errors.completedAt}
                  </p>
                )}
              </div>
              
              {/* Duration Display */}
              <div className="pt-2 border-t border-slate-200">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700">Actual Duration:</span>
                    <span className="text-lg font-bold text-blue-600">{actualDuration} minutes</span>
                  </div>
                
                  {task.estimatedDuration && actualDuration !== task.estimatedDuration && (
                    <p className={`text-sm mt-1 ${
                      actualDuration > task.estimatedDuration 
                        ? 'text-orange-600' 
                        : 'text-green-600'
                    }`}>
                      {actualDuration > task.estimatedDuration
                        ? `⏱️ ${actualDuration - task.estimatedDuration} min over estimate`
                        : `⚡ ${task.estimatedDuration - actualDuration} min under estimate`
                      }
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2" id="status-label">
              How did it go? *
            </label>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="status-label">
              <button
                type="button"
                onClick={() => {
                  setFormData({...formData, status: 'completed'});
                  setErrors({...errors, issuesEncountered: ''});
                }}
                className={`p-4 border-2 rounded-lg transition ${
                  formData.status === 'completed'
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-300 bg-white hover:border-slate-400'
                }`}
                aria-pressed={formData.status === 'completed'}
                aria-label="Task completed successfully"
              >
                <div className="text-2xl mb-1" aria-hidden="true">✅</div>
                <div className="text-sm font-medium text-green-900">Complete</div>
              </button>
              
              <button
                type="button"
                onClick={() => setFormData({...formData, status: 'incomplete'})}
                className={`p-4 border-2 rounded-lg transition ${
                  formData.status === 'incomplete'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-slate-300 bg-white hover:border-slate-400'
                }`}
                aria-pressed={formData.status === 'incomplete'}
                aria-label="Task partially completed"
              >
                <div className="text-2xl mb-1" aria-hidden="true">⚠️</div>
                <div className="text-sm font-medium text-yellow-900">Partial</div>
              </button>
              
              <button
                type="button"
                onClick={() => setFormData({...formData, status: 'error'})}
                className={`p-4 border-2 rounded-lg transition ${
                  formData.status === 'error'
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-300 bg-white hover:border-slate-400'
                }`}
                aria-pressed={formData.status === 'error'}
                aria-label="Task had issues"
              >
                <div className="text-2xl mb-1" aria-hidden="true">❌</div>
                <div className="text-sm font-medium text-red-900">Issues</div>
              </button>
            </div>
          </div>
          
          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Any additional notes or observations..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-none text-slate-900 placeholder-slate-400"
              rows={3}
            />
          </div>
          
          {/* Issues (required if not completed) */}
          {formData.status !== 'completed' && (
            <div>
              <label htmlFor="issuesEncountered" className="block text-sm font-medium text-slate-700 mb-2">
                What issues did you encounter? *
              </label>
              <textarea
                id="issuesEncountered"
                value={formData.issuesEncountered}
                onChange={(e) => {
                  setFormData({...formData, issuesEncountered: e.target.value});
                  setErrors({...errors, issuesEncountered: ''});
                }}
                placeholder="Describe the problems or why task wasn't fully completed..."
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-none text-slate-900 placeholder-slate-400 ${
                  errors.issuesEncountered ? 'border-red-300' : 'border-slate-300'
                }`}
                rows={3}
                required
                aria-required="true"
                aria-invalid={errors.issuesEncountered ? 'true' : 'false'}
                aria-describedby={errors.issuesEncountered ? 'issuesEncountered-error' : undefined}
              />
              {errors.issuesEncountered && (
                <p id="issuesEncountered-error" className="text-sm text-red-600 mt-1" role="alert">
                  {errors.issuesEncountered}
                </p>
              )}
              {!errors.issuesEncountered && formData.issuesEncountered.trim().length === 0 && (
                <p className="text-sm text-orange-600 mt-1">
                  ⚠️ Please describe the issues encountered
                </p>
              )}
            </div>
          )}
        </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3 p-6 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
            aria-label="Cancel task completion"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Submit task completion"
            aria-busy={submitting}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Submitting...
              </span>
            ) : (
              '✅ Submit Completion'
            )}
          </button>
        </div>
        
        {!isValid && (
          <p className="text-sm text-slate-500 text-center mt-3 px-6 pb-6">
            {actualDuration <= 0 
              ? 'End time must be after start time'
              : 'Please describe any issues encountered'
            }
          </p>
        )}
      </div>
    </div>
  );
}

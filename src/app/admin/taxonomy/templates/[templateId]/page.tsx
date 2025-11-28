/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, GripVertical } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Step {
  order: number;
  title: string;
  description: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Template {
  id: string;
  category_id: string;
  name: string;
  description: string;
  steps: Step[];
  tools_required: string[];
  safety_notes: string[];
  estimated_duration_minutes: number;
  difficulty_level: string;
  priority: string;
}

export default function TemplateEditorPage() {
  const router = useRouter();
  const params = useParams();
  const { getIdToken } = useAuth();
  const templateId = params.templateId as string;
  const isNew = templateId === 'new';
  
  const [template, setTemplate] = useState<Partial<Template>>({
    name: '',
    description: '',
    steps: [],
    tools_required: [],
    safety_notes: [],
    estimated_duration_minutes: 15,
    difficulty_level: 'medium',
    priority: 'medium',
  });
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  
  // Tool input state
  const [newTool, setNewTool] = useState('');
  const [newSafetyNote, setNewSafetyNote] = useState('');

  useEffect(() => {
    loadCategories();
    if (!isNew) {
      loadTemplate();
    }
  }, [templateId]);

  async function loadCategories() {
    try {
      const token = await getIdToken();
      const response = await fetch('/api/admin/taxonomy/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }

  async function loadTemplate() {
    try {
      const token = await getIdToken();
      const response = await fetch(`/api/admin/taxonomy/templates/${templateId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setTemplate({
          ...data.template,
          steps: data.template.steps || [],
          tools_required: data.template.tools_required || [],
          safety_notes: data.template.safety_notes || [],
        });
      }
    } catch (error) {
      console.error('Failed to load template:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const token = await getIdToken();
      const url = isNew
        ? '/api/admin/taxonomy/templates'
        : `/api/admin/taxonomy/templates/${templateId}`;
      
      const method = isNew ? 'POST' : 'PATCH';
      
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(template),
      });
      
      const data = await response.json();
      
      if (data.success) {
        router.push('/admin/taxonomy');
      } else {
        alert('Failed to save: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  function addStep() {
    const newStep: Step = {
      order: (template.steps?.length || 0) + 1,
      title: '',
      description: '',
    };
    setTemplate({
      ...template,
      steps: [...(template.steps || []), newStep],
    });
  }

  function updateStep(index: number, field: keyof Step, value: string | number) {
    const updatedSteps = [...(template.steps || [])];
    updatedSteps[index] = { ...updatedSteps[index], [field]: value };
    setTemplate({ ...template, steps: updatedSteps });
  }

  function removeStep(index: number) {
    const updatedSteps = (template.steps || []).filter((_, i) => i !== index);
    // Reorder
    updatedSteps.forEach((step, i) => {
      step.order = i + 1;
    });
    setTemplate({ ...template, steps: updatedSteps });
  }

  function addTool() {
    if (newTool.trim()) {
      setTemplate({
        ...template,
        tools_required: [...(template.tools_required || []), newTool.trim()],
      });
      setNewTool('');
    }
  }

  function removeTool(index: number) {
    const updatedTools = (template.tools_required || []).filter((_, i) => i !== index);
    setTemplate({ ...template, tools_required: updatedTools });
  }

  function addSafetyNote() {
    if (newSafetyNote.trim()) {
      setTemplate({
        ...template,
        safety_notes: [...(template.safety_notes || []), newSafetyNote.trim()],
      });
      setNewSafetyNote('');
    }
  }

  function removeSafetyNote(index: number) {
    const updatedNotes = (template.safety_notes || []).filter((_, i) => i !== index);
    setTemplate({ ...template, safety_notes: updatedNotes });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isNew ? 'New Template' : 'Edit Template'}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {isNew ? 'Create a reusable task template' : template.name}
                </p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !template.name}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Basic Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={template.category_id || ''}
                  onChange={e => setTemplate({ ...template, category_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={template.name || ''}
                  onChange={e => setTemplate({ ...template, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Clean Kitchen Sink"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={template.description || ''}
                  onChange={e => setTemplate({ ...template, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of this task..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={template.estimated_duration_minutes || 15}
                    onChange={e => setTemplate({ ...template, estimated_duration_minutes: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={template.difficulty_level || 'medium'}
                    onChange={e => setTemplate({ ...template, difficulty_level: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={template.priority || 'medium'}
                    onChange={e => setTemplate({ ...template, priority: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Steps
              </h2>
              <button
                onClick={addStep}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Step
              </button>
            </div>

            {(template.steps || []).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No steps yet. Add your first step above.
              </div>
            ) : (
              <div className="space-y-4">
                {(template.steps || []).map((step, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-2 pt-2">
                        <GripVertical className="h-5 w-5 text-gray-400" />
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                          {step.order}
                        </div>
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        <input
                          type="text"
                          value={step.title}
                          onChange={e => updateStep(index, 'title', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="Step title"
                        />
                        <textarea
                          value={step.description}
                          onChange={e => updateStep(index, 'description', e.target.value)}
                          rows={2}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="Step description"
                        />
                      </div>

                      <button
                        onClick={() => removeStep(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tools Required */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Tools Required
            </h2>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newTool}
                onChange={e => setNewTool(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTool())}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., Dish soap, Sponge..."
              />
              <button
                onClick={addTool}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
            </div>

            {(template.tools_required || []).length === 0 ? (
              <p className="text-sm text-gray-500">No tools added yet</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(template.tools_required || []).map((tool, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full"
                  >
                    <span className="text-sm text-gray-700">{tool}</span>
                    <button
                      onClick={() => removeTool(index)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Safety Notes */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Safety Notes (Optional)
            </h2>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newSafetyNote}
                onChange={e => setNewSafetyNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSafetyNote())}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Add a safety warning or precaution..."
              />
              <button
                onClick={addSafetyNote}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
            </div>

            {(template.safety_notes || []).length === 0 ? (
              <p className="text-sm text-gray-500">No safety notes added</p>
            ) : (
              <div className="space-y-2">
                {(template.safety_notes || []).map((note, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    <span className="text-yellow-600">⚠️</span>
                    <span className="flex-1 text-sm text-gray-700">{note}</span>
                    <button
                      onClick={() => removeSafetyNote(index)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


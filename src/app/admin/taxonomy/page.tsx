/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect } from 'react';
import { Plus, FolderTree, FileText, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  template_count: number;
}

interface Template {
  id: string;
  category_id: string;
  name: string;
  description: string;
  estimated_duration_minutes: number;
  difficulty_level: string;
  usage_count: number;
}

export default function TaxonomyPage() {
  const router = useRouter();
  const { getIdToken } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategoryId) {
      loadTemplates(selectedCategoryId);
    } else {
      setTemplates([]);
    }
  }, [selectedCategoryId]);

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
    } finally {
      setLoading(false);
    }
  }

  async function loadTemplates(categoryId: string) {
    try {
      const token = await getIdToken();
      const response = await fetch(`/api/admin/taxonomy/templates?categoryId=${categoryId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }

  const getCategoryIcon = (icon: string) => {
    const icons: Record<string, string> = {
      'ChefHat': '👨‍🍳',
      'Bath': '🛁',
      'Home': '🏠',
      'Trees': '🌳',
    };
    return icons[icon] || '📁';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Task Taxonomy</h1>
              <p className="text-gray-600 mt-1">
                Manage task categories and templates
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin/taxonomy/categories/new')}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Category
              </button>
              <button
                onClick={() => router.push('/admin/taxonomy/templates/new')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Template
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Categories List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FolderTree className="h-5 w-5" />
                  Categories
                </h2>
              </div>
              <div className="divide-y divide-gray-200">
                {loading ? (
                  <div className="p-8 text-center text-gray-500">
                    Loading categories...
                  </div>
                ) : categories.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No categories yet
                  </div>
                ) : (
                  categories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={`w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                        selectedCategoryId === category.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${category.color}20` }}
                        >
                          <span style={{ color: category.color }} className="text-lg">
                            {getCategoryIcon(category.icon)}
                          </span>
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-gray-900">
                            {category.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {category.template_count} templates
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Templates List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Templates
                  {selectedCategoryId && ` (${templates.length})`}
                </h2>
              </div>
              <div className="divide-y divide-gray-200">
                {!selectedCategoryId ? (
                  <div className="p-12 text-center text-gray-500">
                    Select a category to view templates
                  </div>
                ) : templates.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    No templates in this category
                  </div>
                ) : (
                  templates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => router.push(`/admin/taxonomy/templates/${template.id}`)}
                      className="w-full p-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {template.name}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {template.description}
                          </p>
                          <div className="flex items-center gap-4 mt-3">
                            <span className="text-xs text-gray-500">
                              ⏱️ {template.estimated_duration_minutes} min
                            </span>
                            <span className="text-xs text-gray-500">
                              📊 {template.difficulty_level}
                            </span>
                            <span className="text-xs text-gray-500">
                              🔄 Used {template.usage_count} times
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 ml-4" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


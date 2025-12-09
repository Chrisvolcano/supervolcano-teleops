'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  Package, Download, Clock, CheckCircle, 
  AlertTriangle, RefreshCw, Calendar, Film, HardDrive, Timer,
  FileJson, Archive, ExternalLink
} from 'lucide-react';

interface ExportItem {
  id: string;
  name: string;
  description?: string;
  partnerName?: string;
  status: 'preparing' | 'generating_zip' | 'ready' | 'expired' | 'failed';
  deliveryMethod: 'manifest' | 'zip' | 'both';
  videoCount: number;
  totalSizeBytes: number;
  totalDurationSeconds: number;
  manifestUrl?: string;
  zipUrl?: string;
  zipSizeBytes?: number;
  expiresAt: string;
  createdAt: string;
  createdByEmail: string;
}

export default function ExportsPage() {
  const { user } = useAuth();
  const [exports, setExports] = useState<ExportItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExports = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/contributions/export', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setExports(data.exports || []);
    } catch (error) {
      console.error('Failed to fetch exports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExports();
  }, [user]);

  const formatSize = (bytes: number) => {
    if (!bytes) return '—';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '—';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  const getStatusBadge = (exp: ExportItem) => {
    const expired = isExpired(exp.expiresAt);
    
    if (expired) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-500 text-sm rounded-full">
          <AlertTriangle className="w-4 h-4" />
          Expired
        </span>
      );
    }
    
    if (exp.status === 'ready') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 text-sm rounded-full">
          <CheckCircle className="w-4 h-4" />
          Ready
        </span>
      );
    }
    
    if (exp.status === 'preparing' || exp.status === 'generating_zip') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded-full">
          <RefreshCw className="w-4 h-4 animate-spin" />
          {exp.status === 'generating_zip' ? 'Creating ZIP...' : 'Preparing...'}
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded-full">
        <AlertTriangle className="w-4 h-4" />
        Failed
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Training Data Exports</h1>
          <p className="text-gray-600">Manage and download partner training data packages</p>
        </div>
        <button
          onClick={fetchExports}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : exports.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No exports yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Create exports from the Contributions page by selecting approved videos
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {exports.map(exp => {
            const expired = isExpired(exp.expiresAt);
            
            return (
              <div key={exp.id} className={`bg-white rounded-xl border p-6 ${expired ? 'border-gray-200 opacity-60' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      expired ? 'bg-gray-100' : 'bg-indigo-100'
                    }`}>
                      <Package className={`w-6 h-6 ${expired ? 'text-gray-400' : 'text-indigo-600'}`} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900">{exp.name}</h3>
                      {exp.description && (
                        <p className="text-sm text-gray-500 mt-0.5">{exp.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Film className="w-4 h-4" />
                          {exp.videoCount} videos
                        </span>
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-4 h-4" />
                          {formatSize(exp.totalSizeBytes)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Timer className="w-4 h-4" />
                          {formatDuration(exp.totalDurationSeconds)}
                        </span>
                        {exp.zipSizeBytes && (
                          <span className="flex items-center gap-1">
                            <Archive className="w-4 h-4" />
                            ZIP: {formatSize(exp.zipSizeBytes)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>Created by {exp.createdByEmail}</span>
                        <span>•</span>
                        <span>{formatDate(exp.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
                    {getStatusBadge(exp)}
                    
                    {!expired && exp.status === 'ready' && (
                      <div className="flex items-center gap-2">
                        {exp.manifestUrl && (
                          <a
                            href={exp.manifestUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                          >
                            <FileJson className="w-4 h-4" />
                            Manifest
                          </a>
                        )}
                        {exp.zipUrl && (
                          <a
                            href={exp.zipUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
                          >
                            <Download className="w-4 h-4" />
                            Download ZIP
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {!expired && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    Expires {formatDate(exp.expiresAt)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Database, 
  Film, 
  Send, 
  Clock,
  HardDrive, 
  Package, 
  Plus, 
  Edit2, 
  Save, 
  X, 
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  FolderSync,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { DriveFolderPicker } from '@/components/admin/DriveFolderPicker';
import { useToast } from '@/components/ui/Toast';
import { SkeletonDashboard, SkeletonCard } from '@/components/ui/Skeleton';

interface DataHoldings {
  collectedVideos: number;
  collectedHours: number;
  collectedStorageGB: number;
  deliveredVideos: number;
  deliveredHours: number;
  deliveredStorageGB: number;
}

interface Delivery {
  id: string;
  videoCount: number;
  sizeGB: number;
  hours?: number;
  description: string;
  date: string;
  partnerId?: string | null;
  partnerName?: string | null;
}

interface Partner {
    id: string;
    name: string;
}
  
interface DataSource {
    name: string;
  videoCount: number;
  hours: number;
}

interface DriveSource {
    id: string;
  folderId: string;
    name: string;
  type: 'drive';
  videoCount: number;
  totalSizeGB: number;
  estimatedHours: number;
  lastSync: string | null;
}

interface DataIntelligenceData {
  holdings: DataHoldings;
  deliveries: Delivery[];
  sources: DataSource[];
}

interface OperationsData {
  totalOrganizations: number;
  totalLocations: number;
  totalTeleoperators: number;
    totalTasks: number;
  totalCompletions: number;
  totalSessions: number;
  totalWorkMinutes: number;
  activeSessionsNow: number;
}

// Custom hook for animated number countup - MUST be at module level
function useCountUp(target: number, duration: number = 1000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) { 
      setCount(0); 
      return; 
    }

    const startTime = Date.now();
    const startValue = count;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out
      const current = startValue + (target - startValue) * eased;
      
      // Preserve decimals for non-integer values
      if (target % 1 !== 0) {
        setCount(parseFloat(current.toFixed(2)));
      } else {
        setCount(Math.floor(current));
      }

      if (progress >= 1) {
        clearInterval(timer);
        setCount(target);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [target, duration]);

  return count;
}

// Animated Value Component - just the animated number
function AnimatedValue({ 
  value, 
  format = (v: number) => v.toLocaleString(),
}: {
  value: number;
  format?: (v: number) => string;
}) {
  const animatedValue = useCountUp(value, 1000);
  return <>{format(animatedValue)}</>;
}

// Animated Stat Card Component - encapsulates useCountUp hook
function AnimatedStatCard({ 
  value, 
  label, 
  icon: Icon, 
  format = (v: number) => v.toLocaleString(),
  delay = 0,
  editable = false,
  onEdit,
  suffix,
  isEditing = false,
  editValue,
  onSave,
  onCancel,
  onEditValueChange,
  editStep = '1',
}: {
  value: number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  format?: (v: number) => string;
  delay?: number;
  editable?: boolean;
  onEdit?: () => void;
  suffix?: string;
  isEditing?: boolean;
  editValue?: number;
  onSave?: () => void;
  onCancel?: () => void;
  onEditValueChange?: (value: number) => void;
  editStep?: string;
}) {
  const animatedValue = useCountUp(value, 1000);
  
  return (
    <div 
      className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#1f1f1f] rounded-2xl p-6 shadow-sm dark:shadow-none relative group transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-none dark:hover:border-[#2a2a2a] h-full flex flex-col"
      style={{ 
        animation: 'fadeInUp 0.3s ease-out forwards',
        animationDelay: `${Math.min(delay, 50)}ms`,
        opacity: 0 
      }}
    >
      {!isEditing && editable && onEdit && (
        <button 
          onClick={onEdit}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1f1f1f] rounded transition-all"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      )}

      <div className="mb-4">
        <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center mb-3">
          <Icon className="h-6 w-6 text-orange-500" />
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {isEditing ? (
          <div className="space-y-2">
            <input
              type="number"
              step={editStep}
              value={editValue ?? 0}
              onChange={(e) => onEditValueChange?.(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#2a2a2a] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-2xl font-bold"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button
                onClick={onSave}
                className="flex-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center justify-center gap-1 text-sm transition-colors"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={onCancel}
                className="flex-1 px-3 py-1.5 bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] rounded-lg flex items-center justify-center gap-1 text-sm transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {format(animatedValue)}{suffix}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DataIntelligencePage() {
  const { getIdToken } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const { addToast } = useToast();
  const [data, setData] = useState<DataIntelligenceData | null>(null);
  const [operations, setOperations] = useState<OperationsData | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [operationsExpanded, setOperationsExpanded] = useState(false);
  const [editingStat, setEditingStat] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<DataHoldings>>({});
  const [showAddDelivery, setShowAddDelivery] = useState(false);
  const [newDelivery, setNewDelivery] = useState({ 
    date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    videoCount: '', 
    sizeGB: '', 
    hours: '', 
    description: '', 
    partnerId: null as string | null, 
    partnerName: null as string | null 
  });
  const [descriptionError, setDescriptionError] = useState<string>('');
  const [partnerFilter, setPartnerFilter] = useState<string>('all');
  const [isMounted, setIsMounted] = useState(false);
  const [showComparison, setShowComparison] = useState(true);
  const [comparisonPeriod, setComparisonPeriod] = useState<string>('week');
  const [driveSources, setDriveSources] = useState<DriveSource[]>([]);
  const [syncingSourceId, setSyncingSourceId] = useState<string | null>(null);
  const [showDrivePicker, setShowDrivePicker] = useState(false);

  // Custom chart tooltip component
  function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;

    const current = payload.find((p: any) => p.dataKey === 'total')?.value || 0;
    const previous = payload.find((p: any) => p.dataKey === 'previousTotal')?.value;
    const delta = previous !== undefined ? current - previous : null;
    const deltaPercent = previous !== undefined && previous > 0 ? ((delta! / previous) * 100).toFixed(1) : null;

    return (
      <div className="bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#2a2a2a] rounded-lg p-3 shadow-lg">
        <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">{label}</p>
        <p className="text-gray-900 dark:text-white font-semibold">{current} videos</p>
        {previous !== undefined && previous > 0 && (
          <>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">vs {previous} prev</p>
            {delta !== null && deltaPercent !== null && (
              <p className={`text-sm font-medium mt-1 ${delta >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)} ({deltaPercent}%)
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  // Sparkline component for mini-charts
  function Sparkline({ data }: { data: { value: number }[] }) {
    if (!data || data.length < 2) return null;

    return (
      <div className="h-8 w-16">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line
              type="monotone"
              dataKey="value"
              stroke="#f97316"
              strokeWidth={1.5}
              dot={false}
              animationDuration={1000}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // All useMemo hooks must be at top level, before any conditional returns
  // Transform deliveries into cumulative chart data with comparison
  const { chartData, comparisonData } = useMemo(() => {
    console.log('[Chart] Data check:', { 
      hasData: !!data, 
      hasDeliveries: !!(data?.deliveries), 
      deliveryCount: data?.deliveries?.length || 0,
      deliveries: data?.deliveries 
    });

    if (!data || !data.deliveries || data.deliveries.length === 0) {
      console.log('[Chart] No deliveries, returning empty');
      return { chartData: [], comparisonData: [] };
    }

    // Sort by date ascending - handle both string dates and Date objects
    const sorted = [...data.deliveries].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      
      // Check for invalid dates
      if (isNaN(dateA) || isNaN(dateB)) {
        console.warn('[Chart] Invalid date found:', { dateA: a.date, dateB: b.date });
      }
      
      return dateA - dateB;
    });

    console.log('[Chart] Sorted deliveries:', sorted);

    // Calculate cumulative totals for all deliveries
    let cumulativeTotal = 0;
    const chartDataPoints = sorted.map(d => {
      cumulativeTotal += d.videoCount || 0;
      const date = d.date ? new Date(d.date) : new Date();
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('[Chart] Invalid date, using current date:', d.date);
      }
      
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      
      return {
        date: formattedDate,
        total: cumulativeTotal,
      };
    });

    console.log('[Chart] Chart data points:', chartDataPoints);

    // For comparison, use the selected period
    const now = new Date();
    let cutoffDate: Date;
    
    switch (comparisonPeriod) {
      case 'week':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Calculate previous period data
    const periodDuration = now.getTime() - cutoffDate.getTime();
    const previousCutoff = new Date(cutoffDate.getTime() - periodDuration);
    
    let prevTotal = 0;
    const previous = sorted
      .filter(d => {
        const deliveryDate = new Date(d.date);
        return deliveryDate >= previousCutoff && deliveryDate < cutoffDate;
      })
      .map((d) => {
        prevTotal += d.videoCount || 0;
        const date = new Date(d.date);
        const formattedDate = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        return {
          date: formattedDate,
          previousTotal: prevTotal,
        };
      });

    // Merge comparison data - align by date
    const merged = chartDataPoints.map((c) => {
      const matchingPrevious = previous.find(p => p.date === c.date);
      return {
        ...c,
        previousTotal: matchingPrevious?.previousTotal || 0,
      };
    });

    console.log('[Chart] Final chart data:', merged);

    return { chartData: merged, comparisonData: previous };
  }, [data, comparisonPeriod]);

  // Get unique partners that have deliveries
  const deliveryPartners = useMemo(() => {
    if (!data || !data.deliveries) return [];
    
    const partnerMap = new Map<string, { id: string; name: string; count: number }>();
    
    data.deliveries.forEach((delivery) => {
      if (delivery.partnerId && delivery.partnerName) {
        const existing = partnerMap.get(delivery.partnerId);
        if (existing) {
          existing.count++;
        } else {
          partnerMap.set(delivery.partnerId, {
            id: delivery.partnerId,
            name: delivery.partnerName,
            count: 1,
          });
        }
      }
    });
    
    return Array.from(partnerMap.values());
  }, [data]);

  // Count internal deliveries (no partnerId)
  const internalCount = useMemo(() => {
    if (!data || !data.deliveries) return 0;
    return data.deliveries.filter(d => !d.partnerId).length;
  }, [data]);

  // Filter deliveries based on partner filter
  const filteredDeliveries = useMemo(() => {
    if (!data || !data.deliveries) return [];
    
    if (partnerFilter === 'all') {
      return data.deliveries;
    }
    
    if (partnerFilter === 'internal') {
      return data.deliveries.filter(d => !d.partnerId);
    }
    
    return data.deliveries.filter(d => d.partnerId === partnerFilter);
  }, [data, partnerFilter]);

  // Calculate delivered totals from deliveries array with period comparison
  const deliveredTotals = useMemo(() => {
    if (!data || !data.deliveries) {
      return {
        deliveredVideos: 0,
        deliveredHours: 0,
        deliveredStorageGB: 0,
        previousVideos: 0,
        previousHours: 0,
        previousStorageGB: 0,
      };
    }

    const now = new Date();
    let cutoffDate: Date;
    
    switch (comparisonPeriod) {
      case 'week':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Calculate current period totals
    const currentDeliveries = data.deliveries.filter(d => {
      const deliveryDate = new Date(d.date);
      return deliveryDate >= cutoffDate;
    });

    const currentTotals = currentDeliveries.reduce((acc, delivery) => {
      acc.deliveredVideos += delivery.videoCount || 0;
      acc.deliveredStorageGB += delivery.sizeGB || 0;
      
      const hours = delivery.hours !== null && delivery.hours !== undefined
        ? delivery.hours
        : (delivery.sizeGB || 0) / 15;
      acc.deliveredHours += hours;
      
      return acc;
    }, {
      deliveredVideos: 0,
      deliveredHours: 0,
      deliveredStorageGB: 0,
    });

    // Calculate previous period totals (same duration before cutoff)
    const periodDuration = now.getTime() - cutoffDate.getTime();
    const previousCutoff = new Date(cutoffDate.getTime() - periodDuration);
    
    const previousDeliveries = data.deliveries.filter(d => {
      const deliveryDate = new Date(d.date);
      return deliveryDate >= previousCutoff && deliveryDate < cutoffDate;
    });

    const previousTotals = previousDeliveries.reduce((acc, delivery) => {
      acc.previousVideos += delivery.videoCount || 0;
      acc.previousStorageGB += delivery.sizeGB || 0;
      
      const hours = delivery.hours !== null && delivery.hours !== undefined
        ? delivery.hours
        : (delivery.sizeGB || 0) / 15;
      acc.previousHours += hours;
      
      return acc;
    }, {
      previousVideos: 0,
      previousHours: 0,
      previousStorageGB: 0,
    });

    return {
      ...currentTotals,
      ...previousTotals,
    };
  }, [data, comparisonPeriod]);

  // Create sparkline data from deliveries
  const sparklineData = useMemo(() => {
    if (!data || !data.deliveries || data.deliveries.length < 2) {
      return { videos: [], hours: [], storage: [] };
    }

    const sorted = [...data.deliveries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let videoTotal = 0, hourTotal = 0, storageTotal = 0;

    return {
      videos: sorted.slice(-10).map(d => ({ value: videoTotal += d.videoCount })),
      hours: sorted.slice(-10).map(d => ({ value: hourTotal += (d.hours || d.sizeGB / 15) })),
      storage: sorted.slice(-10).map(d => ({ value: storageTotal += d.sizeGB })),
    };
  }, [data]);
  
  useEffect(() => {
    loadData();
    loadPartners();
    loadDriveSources();
    // Trigger mount animation after a brief delay
    setTimeout(() => setIsMounted(true), 100);
  }, []);
  
  const loadPartners = async () => {
    try {
      const token = await getIdToken();
      if (!token) return;
      const response = await fetch('/api/admin/organizations', {
        headers: { 'x-firebase-token': token },
      });
      if (response.ok) {
        const data = await response.json();
        // Response format: { success: true, organizations: [...], total: number }
        const orgs = data.organizations || [];
        setPartners(orgs.map((org: any) => ({ id: org.id, name: org.name })));
      }
    } catch (error) {
      console.error('Failed to load partners:', error);
    }
  };

  async function loadDriveSources() {
    try {
      const token = await getIdToken();
      if (!token) return;
      const response = await fetch('/api/admin/data-intelligence/drive-sync', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setDriveSources(data.sources || []);
      }
    } catch (error) {
      console.error('Failed to load drive sources:', error);
    }
  }

  async function syncDriveSource(folderId: string, name: string) {
    setSyncingSourceId(folderId);
    try {
      const token = await getIdToken();
      if (!token) return;

      const response = await fetch('/api/admin/data-intelligence/drive-sync', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, sourceName: name }),
      });

      if (response.ok) {
        const responseData = await response.json();
        // API returns { success: true, folderId, name, type, videoCount, totalSizeGB, estimatedHours, lastSync, ... }
        // lastSync is already serialized as ISO string by NextResponse.json
        const sourceData: DriveSource = {
          id: responseData.folderId,
          folderId: responseData.folderId,
          name: responseData.name,
          type: 'drive',
          videoCount: responseData.videoCount,
          totalSizeGB: responseData.totalSizeGB,
          estimatedHours: responseData.estimatedHours,
          lastSync: responseData.lastSync || null,
        };
        setDriveSources(prev => {
          const existing = prev.findIndex(s => s.folderId === folderId);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = sourceData;
            return updated;
          }
          return [...prev, sourceData];
        });
        addToast('success', 'Drive synced', `Found ${responseData.videoCount} videos (${responseData.totalSizeGB.toFixed(1)} GB)`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        addToast('error', 'Sync failed', errorData.error || 'Could not sync Drive folder');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      addToast('error', 'Sync failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSyncingSourceId(null);
    }
  }

  async function handleDriveFolderSelected(folderId: string, folderName: string, sourceName: string) {
    await syncDriveSource(folderId, sourceName);
  }

  function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hrs ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  }

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await getIdToken();
      
      // Load data intelligence
      const dataRes = await fetch('/api/admin/data-intelligence', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (dataRes.ok) {
        const dataJson = await dataRes.json();
        setData(dataJson);
      }

      // Load operations data
      const opsRes = await fetch('/api/v1/admin/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (opsRes.ok) {
        const opsJson = await opsRes.json();
        setOperations({
          totalOrganizations: opsJson.totalOrganizations || 0,
          totalLocations: opsJson.totalLocations || 0,
          totalTeleoperators: opsJson.totalTeleoperators || 0,
          totalTasks: opsJson.totalTasks || 0,
          totalCompletions: opsJson.totalCompletions || 0,
          totalSessions: opsJson.totalSessions || 0,
          totalWorkMinutes: opsJson.totalWorkMinutes || 0,
          activeSessionsNow: opsJson.activeSessionsNow || 0,
        });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditStat = (statKey: keyof DataHoldings) => {
    if (!data) return;
    // Prevent editing delivered stats (they're calculated from deliveries)
    if (statKey.startsWith('delivered')) {
      return;
    }
    setEditingStat(statKey);
    // Use the actual stored value, not the calculated/display value
    const storedValue = data.holdings[statKey] as number;
    setEditValues({ [statKey]: storedValue });
  };

  const handleSaveStat = async () => {
    if (!data || !editingStat) return;
    
    // Prevent saving delivered stats (they're calculated from deliveries)
    if (editingStat.startsWith('delivered')) {
      return;
    }
    
    try {
      const token = await getIdToken();
      const response = await fetch('/api/admin/data-intelligence', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ holdings: editValues }),
      });

      if (response.ok) {
        await loadData();
        setEditingStat(null);
        setEditValues({});
        addToast('success', 'Holdings updated', 'Data collected values have been saved');
      } else {
        addToast('error', 'Update failed', 'Could not save holdings');
      }
    } catch (error) {
      console.error('Failed to update holdings:', error);
      addToast('error', 'Update failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleCancelEdit = () => {
    setEditingStat(null);
    setEditValues({});
  };

  // Auto-calculate hours from sizeGB when sizeGB changes and hours is empty
  useEffect(() => {
    if (newDelivery.sizeGB && !newDelivery.hours && parseFloat(newDelivery.sizeGB) > 0) {
      const calculatedHours = parseFloat(newDelivery.sizeGB) / 15;
      setNewDelivery(prev => ({ ...prev, hours: calculatedHours.toFixed(1) }));
    }
  }, [newDelivery.sizeGB]);

  const handleAddDelivery = async () => {
    // Validation
    if (!newDelivery.videoCount || !newDelivery.sizeGB) {
      return;
    }

    // Description is required
    if (!newDelivery.description || newDelivery.description.trim() === '') {
      setDescriptionError('Description is required');
      return;
    }

    setDescriptionError('');

    try {
      const token = await getIdToken();
      if (!token) return;

      // Calculate hours if not provided
      const hours = newDelivery.hours 
        ? parseFloat(newDelivery.hours) 
        : parseFloat(newDelivery.sizeGB) / 15;

      const response = await fetch('/api/admin/data-intelligence/deliveries', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: newDelivery.date, // Use date from picker
          videoCount: parseInt(newDelivery.videoCount),
          sizeGB: parseFloat(newDelivery.sizeGB),
          hours: hours,
          description: newDelivery.description.trim(),
          partnerId: newDelivery.partnerId || null,
          partnerName: newDelivery.partnerName || null,
        }),
      });

      if (response.ok) {
        await loadData();
        setShowAddDelivery(false);
        setNewDelivery({ 
          date: new Date().toISOString().split('T')[0], 
          videoCount: '', 
          sizeGB: '', 
          hours: '', 
          description: '', 
          partnerId: null, 
          partnerName: null 
        });
        setDescriptionError('');
        addToast('success', 'Delivery logged', `${newDelivery.videoCount} videos recorded`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        addToast('error', 'Failed to add delivery', errorData.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Failed to add delivery:', error);
      addToast('error', 'Failed to add delivery', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleDeleteDelivery = async (id: string) => {
    if (!confirm('Delete this delivery entry?')) return;

    try {
      const token = await getIdToken();
      const response = await fetch(`/api/admin/data-intelligence/deliveries/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        await loadData();
        addToast('success', 'Delivery deleted', 'Delivery entry has been removed');
      } else {
        addToast('error', 'Delete failed', 'Could not delete delivery entry');
      }
    } catch (error) {
      console.error('Failed to delete delivery:', error);
      addToast('error', 'Delete failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };
  
  if (loading) {
    return <SkeletonDashboard />;
  }
  
  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load data intelligence</p>
      </div>
    );
  }
  
  // Helper function to format storage (GB or TB)
  const formatStorage = (storageGB: number): string => {
    if (storageGB >= 1000) {
      return `${(storageGB / 1000).toFixed(1)} TB`;
    }
    return `${storageGB.toFixed(1)} GB`;
  };

  // Helper function to calculate hours from storage if not set
  const getHours = (hours: number, storageGB: number, isEstimated: boolean = false): { value: number; isEstimated: boolean } => {
    if (hours > 0) {
      return { value: hours, isEstimated: false };
    }
    // Auto-calculate: storageGB / 15 (1080p 30fps estimate)
    const calculated = storageGB / 15;
    return { value: calculated, isEstimated: true };
  };

  // Data Collected cards
  const collectedHoursData = getHours(data.holdings.collectedHours, data.holdings.collectedStorageGB);
  const collectedCards = [
    {
      key: 'collectedVideos' as const,
      label: 'Videos',
      icon: Film,
      color: 'blue',
      value: data.holdings.collectedVideos,
      formatValue: (v: number) => v.toLocaleString(),
    },
    {
      key: 'collectedHours' as const,
      label: 'Hours of Footage',
      icon: Clock,
      color: 'blue',
      value: collectedHoursData.value,
      isEstimated: collectedHoursData.isEstimated,
      formatValue: (v: number) => v.toFixed(1),
    },
    {
      key: 'collectedStorageGB' as const,
      label: 'Total Storage',
      icon: HardDrive,
      color: 'blue',
      value: data.holdings.collectedStorageGB,
      formatValue: (v: number) => formatStorage(v),
    },
  ];

  // Data Delivered cards (calculated from deliveries, not editable)
  const deliveredCards = [
    {
      key: 'deliveredVideos' as const,
      label: 'Videos',
      icon: Film,
      color: 'green',
      value: deliveredTotals.deliveredVideos,
      formatValue: (v: number) => v.toLocaleString(),
      isEditable: false,
    },
    {
      key: 'deliveredHours' as const,
      label: 'Hours of Footage',
      icon: Clock,
      color: 'green',
      value: deliveredTotals.deliveredHours,
      isEstimated: false, // Calculated from actual data, not estimated
      formatValue: (v: number) => v.toFixed(1),
      isEditable: false,
    },
    {
      key: 'deliveredStorageGB' as const,
      label: 'Total Storage',
      icon: HardDrive,
      color: 'green',
      value: deliveredTotals.deliveredStorageGB,
      formatValue: (v: number) => formatStorage(v),
      isEditable: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
      <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-2.5">
              <Database className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">Data Intelligence</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Track data holdings, partner deliveries, and operational metrics
        </p>
      </div>
            <button
          onClick={async () => {
            setIsRefreshing(true);
            await loadData();
            await loadDriveSources();
            setIsRefreshing(false);
            addToast('success', 'Data refreshed', 'All data has been updated');
          }}
          disabled={isRefreshing}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1f1f1f] rounded-lg transition-colors"
          title="Refresh data"
        >
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
                </div>
      
      {/* Data Holdings Section */}
      <div className="space-y-6">
        {/* Data Collected Section */}
        <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#1f1f1f] rounded-2xl p-6 shadow-sm dark:shadow-none hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-none dark:hover:border-[#2a2a2a] transition-all duration-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Database className="h-5 w-5 text-blue-500" />
              </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Data Collected</h2>
              </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {collectedCards.map((stat, index) => {
              const isEditing = editingStat === stat.key;
              const editValue = isEditing 
                ? (editValues[stat.key] ?? data.holdings[stat.key] ?? 0)
                : stat.value;
              const editStep = stat.key.includes('Hours') ? '0.1' : stat.key.includes('Storage') ? '0.01' : '1';

              return (
                <AnimatedStatCard
                  key={stat.key}
                  value={isMounted ? stat.value : 0}
                  label={stat.label + (stat.isEstimated ? ' (est.)' : '')}
                  icon={stat.icon}
                  format={stat.formatValue}
                  delay={index * 20}
                  editable={true}
                  onEdit={() => handleEditStat(stat.key)}
                  isEditing={isEditing}
                  editValue={editValue}
                  onSave={handleSaveStat}
                  onCancel={handleCancelEdit}
                  onEditValueChange={(value) => setEditValues({ [stat.key]: value })}
                  editStep={editStep}
                />
          );
        })}
          </div>
      </div>
      
        {/* Data Delivered to Partners Section */}
        <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#1f1f1f] rounded-2xl p-6 shadow-sm dark:shadow-none hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-none dark:hover:border-[#2a2a2a] transition-all duration-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <Send className="h-5 w-5 text-green-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Data Delivered to Partners</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {deliveredCards.map((stat, index) => {
              // Calculate delta badge
              const current = index === 0 ? deliveredTotals.deliveredVideos 
                : index === 1 ? deliveredTotals.deliveredHours 
                : deliveredTotals.deliveredStorageGB;
              const previous = index === 0 ? deliveredTotals.previousVideos 
                : index === 1 ? deliveredTotals.previousHours 
                : deliveredTotals.previousStorageGB;
              
              let deltaBadge = null;
              if (previous > 0) {
                const delta = current - previous;
                const deltaPercent = ((delta / previous) * 100).toFixed(1);
                const isPositive = delta >= 0;
                deltaBadge = (
                  <div className={`text-sm font-medium mt-1 ${isPositive ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                    {isPositive ? '↑' : '↓'} {Math.abs(parseFloat(deltaPercent))}%
                  </div>
                );
              } else if (current > 0 && previous === 0) {
                // Show 100% increase if there's current data but no previous period data
                deltaBadge = (
                  <div className="text-sm font-medium mt-1 text-green-600 dark:text-green-500">
                    ↑ 100%
                  </div>
                );
              }

          return (
            <div
                  key={stat.key}
                  className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#1f1f1f] rounded-2xl p-6 shadow-sm dark:shadow-none transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-none dark:hover:border-[#2a2a2a] h-full flex flex-col"
                  style={{ 
                    animation: 'fadeInUp 0.3s ease-out forwards',
                    animationDelay: `${Math.min((index + 3) * 20, 100)}ms`,
                    opacity: 0 
                  }}
                >
                  <div className="mb-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center mb-3">
                      <stat.icon className="h-6 w-6 text-orange-500" />
                </div>
                </div>

                  <div className="flex items-end justify-between flex-1">
                    <div className="flex-1">
                      <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        <AnimatedValue
                          value={isMounted ? stat.value : 0}
                          format={stat.formatValue}
                        />
              </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {stat.label}
              </div>
                      {deltaBadge}
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      {index === 0 && sparklineData.videos.length >= 2 && (
                        <Sparkline data={sparklineData.videos} />
                      )}
                      {index === 1 && sparklineData.hours.length >= 2 && (
                        <Sparkline data={sparklineData.hours} />
                      )}
                      {index === 2 && sparklineData.storage.length >= 2 && (
                        <Sparkline data={sparklineData.storage} />
                      )}
                    </div>
                  </div>
            </div>
          );
        })}
          </div>
      </div>
      
      {/* Delivery Trend Chart */}
      <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#1f1f1f] rounded-2xl p-6 shadow-sm dark:shadow-none hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-none dark:hover:border-[#2a2a2a] transition-all duration-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Delivery Trend</h2>
          <div className="relative">
            <select
              value={comparisonPeriod}
              onChange={(e) => setComparisonPeriod(e.target.value)}
              className="appearance-none bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#2a2a2a] rounded-lg px-4 py-2 pr-8 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:border-gray-300 dark:hover:border-[#3a3a3a] transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              <option value="week">vs Last Week</option>
              <option value="month">vs Last Month</option>
              <option value="quarter">vs Last Quarter</option>
              <option value="year">vs Last Year</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
            </div>
          </div>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-gray-500 dark:text-gray-400">
            <p className="text-sm">Delivery trend will appear as you log deliveries</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: theme === 'dark' ? '#1f1f1f' : '#e5e7eb' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: theme === 'dark' ? '#1f1f1f' : '#e5e7eb' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#f97316"
                fill="url(#orangeGradient)"
                strokeWidth={2.5}
                animationDuration={1500}
              />
              {showComparison && chartData.some(d => d.previousTotal > 0) && (
                <Line
                  type="monotone"
                  dataKey="previousTotal"
                  stroke="#6b7280"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  animationDuration={1500}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Delivery Log Section */}
      <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#1f1f1f] rounded-2xl shadow-sm dark:shadow-none hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-none dark:hover:border-[#2a2a2a] transition-all duration-200">
        <div className="p-6 border-b border-gray-200 dark:border-[#1f1f1f]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Delivery Log</h2>
                  </div>
                    <div className="flex items-center gap-3">
              {!showAddDelivery && (
                <>
                  <select
                    value={partnerFilter}
                    onChange={(e) => setPartnerFilter(e.target.value)}
                    className="px-3 py-1.5 text-sm bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#2a2a2a] rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  >
                    <option value="all">All Partners ({data.deliveries.length})</option>
                    {internalCount > 0 && (
                      <option value="internal">Internal ({internalCount})</option>
                    )}
                    {deliveryPartners.map(partner => (
                      <option key={partner.id} value={partner.id}>
                        {partner.name} ({partner.count})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowAddDelivery(true)}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Entry
                  </button>
                </>
            )}
                      </div>
        </div>
      </div>
      
        {showAddDelivery && (
          <div className="p-6 border-b border-gray-200 dark:border-[#1f1f1f]">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={newDelivery.date}
                  onChange={(e) => setNewDelivery({ ...newDelivery, date: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#2a2a2a] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  required
                />
                      </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Video Count
                </label>
                <input
                  type="number"
                  value={newDelivery.videoCount}
                  onChange={(e) => setNewDelivery({ ...newDelivery, videoCount: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#2a2a2a] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  placeholder="0"
                />
                    </div>
                <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Size (GB)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newDelivery.sizeGB}
                  onChange={(e) => setNewDelivery({ ...newDelivery, sizeGB: e.target.value, hours: '' })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#2a2a2a] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  placeholder="0.00"
                />
              </div>
                <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hours
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newDelivery.hours}
                  onChange={(e) => setNewDelivery({ ...newDelivery, hours: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#2a2a2a] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  placeholder="Auto-calculated"
                />
                {newDelivery.sizeGB && !newDelivery.hours && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Will calculate: {(parseFloat(newDelivery.sizeGB) / 15).toFixed(1)} hrs
                  </p>
                )}
                    </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Partner
                </label>
                <select
                  value={newDelivery.partnerId || ''}
                  onChange={(e) => {
                    const selectedId = e.target.value || null;
                    const selectedPartner = partners.find(p => p.id === selectedId);
                    setNewDelivery({
                      ...newDelivery,
                      partnerId: selectedId,
                      partnerName: selectedPartner?.name || null,
                    });
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#2a2a2a] rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                >
                  <option value="">Internal / No Partner</option>
                  {partners.map(partner => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                type="text"
                value={newDelivery.description}
                onChange={(e) => {
                  setNewDelivery({ ...newDelivery, description: e.target.value });
                  if (descriptionError) setDescriptionError('');
                }}
                className={`w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 ${
                  descriptionError ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-[#2a2a2a]'
                }`}
                placeholder="Delivery description"
                required
              />
              {descriptionError && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">{descriptionError}</p>
            )}
          </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddDelivery}
                disabled={!newDelivery.videoCount || !newDelivery.sizeGB || !newDelivery.description?.trim()}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Entry
              </button>
              <button
                onClick={() => {
                  setShowAddDelivery(false);
                  setNewDelivery({ 
                    date: new Date().toISOString().split('T')[0], 
                    videoCount: '', 
                    sizeGB: '', 
                    hours: '', 
                    description: '', 
                    partnerId: null, 
                    partnerName: null 
                  });
                  setDescriptionError('');
                }}
                className="px-4 py-2 bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
              )}
              
          <div className="p-6">
          {filteredDeliveries.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {data.deliveries.length === 0 ? 'No deliveries recorded yet' : 'No deliveries match the selected filter'}
            </div>
          ) : (
            <div className="space-y-0">
              {filteredDeliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] border-b border-gray-100 dark:border-[#1f1f1f] group transition-colors animate-fadeIn last:border-b-0"
                >
                  <div className="flex items-center gap-6 flex-1">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {delivery.videoCount} videos • {delivery.hours !== null && delivery.hours !== undefined ? `${delivery.hours.toFixed(1)} hrs` : `${(delivery.sizeGB / 15).toFixed(1)} hrs (est.)`} • {delivery.sizeGB} GB
                    </div>
                    </div>
                <div>
                      {delivery.partnerId ? (
                        <button
                          onClick={() => router.push(`/admin/organizations/${delivery.partnerId}?tab=deliveries`)}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-500 border border-orange-200 dark:border-orange-500/20 hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors"
                        >
                          {delivery.partnerName || 'Partner'}
                        </button>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-500/20">
                          Internal
                        </span>
              )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-700 dark:text-gray-300">{delivery.description}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(delivery.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
          </div>
        </div>
        </div>
            <button
                    onClick={() => handleDeleteDelivery(delivery.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
            </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Data Sources Section */}
      <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#1f1f1f] rounded-2xl shadow-sm dark:shadow-none hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-none dark:hover:border-[#2a2a2a] transition-all duration-200">
        <div className="p-6 border-b border-gray-200 dark:border-[#1f1f1f] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderSync className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Data Sources</h2>
            </div>
          <button
            onClick={() => setShowDrivePicker(true)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Drive Folder
          </button>
          </div>
              
        <div className="divide-y divide-gray-100 dark:divide-[#1f1f1f]">
          {/* Portal Uploads - always show */}
          {data && (
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
                  <Film className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Portal Uploads</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Direct uploads from mobile app</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {data.sources.find(s => s.name === 'Portal Uploads')?.videoCount || 0} videos
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {data.sources.find(s => s.name === 'Portal Uploads')?.hours || 0} hrs
                </p>
                  </div>
                </div>
              )}
              
          {/* Drive Sources */}
          {driveSources.map((source) => (
            <div key={source.id} className="p-4 flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-blue-500" />
            </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{source.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {source.lastSync 
                      ? `Last sync: ${formatTimeAgo(new Date(source.lastSync))}`
                      : 'Never synced'}
                        </p>
                      </div>
                  </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">{source.videoCount} videos</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {source.totalSizeGB} GB • {source.estimatedHours} hrs
                  </p>
                </div>
            <button
                  onClick={() => syncDriveSource(source.folderId, source.name)}
                  disabled={syncingSourceId === source.folderId}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-[#2a2a2a] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1f1f1f] text-gray-700 dark:text-gray-300 disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                  {syncingSourceId === source.folderId ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="relative flex h-2 w-2 ml-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                      </span>
                    </>
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {syncingSourceId === source.folderId ? 'Syncing...' : 'Sync Now'}
            </button>
            </div>
          </div>
          ))}

          {driveSources.length === 0 && !showDrivePicker && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <HardDrive className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No Google Drive folders connected</p>
              <p className="text-sm">Click &quot;Add Drive Folder&quot; to sync external data</p>
        </div>
      )}
        </div>
      </div>
      
      {/* Operations Overview - Collapsible */}
      <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#1f1f1f] rounded-2xl shadow-sm dark:shadow-none hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-none dark:hover:border-[#2a2a2a] transition-all duration-200">
            <button
          onClick={() => setOperationsExpanded(!operationsExpanded)}
          className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors rounded-t-2xl"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Operations Overview</h2>
          {operationsExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          )}
            </button>
            
        {operationsExpanded && operations && (
          <div className="p-6 border-t border-gray-200 dark:border-[#1f1f1f]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-[#1a1a1a] rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Organizations</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{operations.totalOrganizations}</div>
          </div>
              <div className="bg-gray-50 dark:bg-[#1a1a1a] rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Locations</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{operations.totalLocations}</div>
        </div>
              <div className="bg-gray-50 dark:bg-[#1a1a1a] rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Teleoperators</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{operations.totalTeleoperators}</div>
      </div>
              <div className="bg-gray-50 dark:bg-[#1a1a1a] rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Tasks</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{operations.totalTasks}</div>
    </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-[#1a1a1a] rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Completions</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{operations.totalCompletions}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Last 30 days</div>
              </div>
              <div className="bg-gray-50 dark:bg-[#1a1a1a] rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Sessions</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{operations.totalSessions}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Last 30 days</div>
              </div>
              <div className="bg-gray-50 dark:bg-[#1a1a1a] rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Work Time</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(operations.totalWorkMinutes / 60)}h
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Last 30 days</div>
              </div>
              <div className="bg-gray-50 dark:bg-[#1a1a1a] rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Now</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{operations.activeSessionsNow}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Live sessions</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Drive Folder Picker Modal */}
      <DriveFolderPicker
        isOpen={showDrivePicker}
        onClose={() => setShowDrivePicker(false)}
        onSelect={handleDriveFolderSelected}
      />
    </div>
  );
}

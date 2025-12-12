'use client';

import { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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

export default function DataIntelligencePage() {
  const { getIdToken } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DataIntelligenceData | null>(null);
  const [operations, setOperations] = useState<OperationsData | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
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

  // All useMemo hooks must be at top level, before any conditional returns
  // Transform deliveries into cumulative chart data
  const chartData = useMemo(() => {
    if (!data || !data.deliveries || data.deliveries.length < 2) {
      return [];
    }

    // Sort by date ascending
    const sorted = [...data.deliveries].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });

    // Calculate running total
    let runningTotal = 0;
    return sorted.map((delivery) => {
      runningTotal += delivery.videoCount;
      const date = new Date(delivery.date);
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      return {
        date: formattedDate,
        total: runningTotal,
      };
    });
  }, [data]);

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
  
  useEffect(() => {
    loadData();
    loadPartners();
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
      }
    } catch (error) {
      console.error('Failed to update holdings:', error);
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
      }
    } catch (error) {
      console.error('Failed to add delivery:', error);
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
      }
    } catch (error) {
      console.error('Failed to delete delivery:', error);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    );
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

  // Calculate delivered totals from deliveries array
  const deliveredTotals = useMemo(() => {
    if (!data || !data.deliveries) {
      return {
        deliveredVideos: 0,
        deliveredHours: 0,
        deliveredStorageGB: 0,
      };
    }

    const totals = data.deliveries.reduce((acc, delivery) => {
      acc.deliveredVideos += delivery.videoCount || 0;
      acc.deliveredStorageGB += delivery.sizeGB || 0;
      
      // Calculate hours: use delivery.hours if available, otherwise calculate from sizeGB
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

    return totals;
  }, [data]);

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
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Database className="h-8 w-8 text-gray-600" />
          <h1 className="text-3xl font-bold text-gray-900">Data Intelligence</h1>
        </div>
        <p className="text-gray-600">
          Track data holdings, partner deliveries, and operational metrics
        </p>
      </div>
      
      {/* Data Holdings Section */}
      <div className="space-y-6">
        {/* Data Collected Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Database className="h-5 w-5 text-blue-600" />
                </div>
            <h2 className="text-lg font-semibold text-gray-900">Data Collected</h2>
              </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {collectedCards.map((stat) => {
              const Icon = stat.icon;
              const isEditing = editingStat === stat.key;
              // When editing, use the stored value from data.holdings, not the calculated display value
              const editValue = isEditing 
                ? (editValues[stat.key] ?? data.holdings[stat.key] ?? 0)
                : stat.value;

          return (
            <div
                  key={stat.key}
                  className="bg-white border border-gray-200 rounded-xl p-6 relative group hover:shadow-md transition-shadow"
                >
                  {!isEditing && (
                    <button
                      onClick={() => handleEditStat(stat.key)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  
              <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-blue-600" />
                </div>
                    <div className="text-sm font-medium text-gray-600 flex-1">
                      {stat.label}
                </div>
      </div>
      
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="number"
                        step={stat.key.includes('Hours') ? '0.1' : stat.key.includes('Storage') ? '0.01' : '1'}
                        value={editValue}
                        onChange={(e) => setEditValues({ [stat.key]: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-2xl font-bold"
                        autoFocus
                      />
            <div className="flex items-center gap-2">
                        <button
                          onClick={handleSaveStat}
                          className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1 text-sm"
                        >
                          <Save className="w-4 h-4" />
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center justify-center gap-1 text-sm"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-2xl font-bold text-gray-900">
                      {stat.formatValue(stat.value)}
                      {stat.isEstimated && (
                        <span className="text-sm font-normal text-gray-500 ml-2">(est.)</span>
                      )}
                    </div>
                  )}
                  </div>
              );
            })}
          </div>
        </div>
        
        {/* Data Delivered to Partners Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Send className="h-5 w-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Data Delivered to Partners</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {deliveredCards.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.key}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="text-sm font-medium text-gray-600 flex-1">
                      {stat.label}
                    </div>
                  </div>

                  <div className="text-2xl font-bold text-gray-900">
                    {stat.formatValue(stat.value)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Delivery Trend Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Trend</h2>
        {chartData.length < 2 ? (
          <div className="flex items-center justify-center h-[200px] text-gray-500">
            <p className="text-sm">Delivery trend will appear as you log deliveries</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '8px 12px',
                }}
                labelStyle={{ color: '#111827', fontWeight: 600, marginBottom: '4px' }}
                formatter={(value: number) => [`${value} videos`, 'Total']}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorTotal)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Delivery Log Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Delivery Log</h2>
          </div>
          <div className="flex items-center gap-3">
            {!showAddDelivery && (
              <>
                <select
                  value={partnerFilter}
                  onChange={(e) => setPartnerFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Entry
                </button>
              </>
            )}
          </div>
        </div>

        {showAddDelivery && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newDelivery.date}
                  onChange={(e) => setNewDelivery({ ...newDelivery, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Video Count
                </label>
                <input
                  type="number"
                  value={newDelivery.videoCount}
                  onChange={(e) => setNewDelivery({ ...newDelivery, videoCount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Size (GB)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newDelivery.sizeGB}
                  onChange={(e) => setNewDelivery({ ...newDelivery, sizeGB: e.target.value, hours: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hours
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newDelivery.hours}
                  onChange={(e) => setNewDelivery({ ...newDelivery, hours: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Auto-calculated"
                />
                {newDelivery.sizeGB && !newDelivery.hours && (
                  <p className="text-xs text-gray-500 mt-1">
                    Will calculate: {(parseFloat(newDelivery.sizeGB) / 15).toFixed(1)} hrs
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newDelivery.description}
                onChange={(e) => {
                  setNewDelivery({ ...newDelivery, description: e.target.value });
                  if (descriptionError) setDescriptionError('');
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  descriptionError ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Delivery description"
                required
              />
              {descriptionError && (
                <p className="text-xs text-red-500 mt-1">{descriptionError}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddDelivery}
                disabled={!newDelivery.videoCount || !newDelivery.sizeGB || !newDelivery.description?.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 text-sm"
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
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {filteredDeliveries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {data.deliveries.length === 0 ? 'No deliveries recorded yet' : 'No deliveries match the selected filter'}
          </div>
        ) : (
                  <div className="space-y-2">
            {filteredDeliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 group transition-colors"
              >
                <div className="flex items-center gap-6 flex-1">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {delivery.videoCount} videos • {delivery.hours !== null && delivery.hours !== undefined ? `${delivery.hours.toFixed(1)} hrs` : `${(delivery.sizeGB / 15).toFixed(1)} hrs (est.)`} • {delivery.sizeGB} GB
                      </div>
                  </div>
                <div>
                    {delivery.partnerId ? (
                      <button
                        onClick={() => router.push(`/admin/partners/${delivery.partnerId}/deliveries`)}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                      >
                        {delivery.partnerName || 'Partner'}
                      </button>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Internal
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-700">{delivery.description}</div>
                    <div className="text-xs text-gray-500">
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
                  className="opacity-0 group-hover:opacity-100 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
                </div>
              )}
      </div>

      {/* Data Sources Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Sources</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <div className="font-medium text-gray-900">Portal Uploads</div>
              <div className="text-sm text-gray-500">
                {data.sources.find(s => s.name === 'Portal Uploads')?.videoCount || 0} videos • {' '}
                {data.sources.find(s => s.name === 'Portal Uploads')?.hours || 0} hours
              </div>
            </div>
          </div>
          {data.sources.filter(s => s.name !== 'Portal Uploads').map((source) => (
            <div
              key={source.name}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div>
                <div className="font-medium text-gray-900">{source.name}</div>
                <div className="text-sm text-gray-500">
                  {source.videoCount} videos • {source.hours} hours
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Operations Overview - Collapsible */}
      <div className="bg-white border border-gray-200 rounded-lg">
            <button
          onClick={() => setOperationsExpanded(!operationsExpanded)}
          className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900">Operations Overview</h2>
          {operationsExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
            </button>
            
        {operationsExpanded && operations && (
          <div className="p-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Organizations</div>
                <div className="text-2xl font-bold text-gray-900">{operations.totalOrganizations}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Locations</div>
                <div className="text-2xl font-bold text-gray-900">{operations.totalLocations}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Teleoperators</div>
                <div className="text-2xl font-bold text-gray-900">{operations.totalTeleoperators}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Total Tasks</div>
                <div className="text-2xl font-bold text-gray-900">{operations.totalTasks}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Completions</div>
                <div className="text-2xl font-bold text-gray-900">{operations.totalCompletions}</div>
                <div className="text-xs text-gray-500 mt-1">Last 30 days</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Sessions</div>
                <div className="text-2xl font-bold text-gray-900">{operations.totalSessions}</div>
                <div className="text-xs text-gray-500 mt-1">Last 30 days</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Work Time</div>
                <div className="text-2xl font-bold text-gray-900">
                  {Math.round(operations.totalWorkMinutes / 60)}h
                </div>
                <div className="text-xs text-gray-500 mt-1">Last 30 days</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Active Now</div>
                <div className="text-2xl font-bold text-gray-900">{operations.activeSessionsNow}</div>
                <div className="text-xs text-gray-500 mt-1">Live sessions</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

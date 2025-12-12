'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Package, Film, HardDrive, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Partner {
  id: string;
  name: string;
}

interface Delivery {
  id: string;
  videoCount: number;
  sizeGB: number;
  description: string;
  date: string;
  partnerId?: string | null;
  partnerName?: string | null;
}

interface DataIntelligenceData {
  holdings: any;
  deliveries: Delivery[];
  sources: any[];
}

export default function PartnerDeliveriesPage() {
  const params = useParams();
  const router = useRouter();
  const { getIdToken } = useAuth();
  const partnerId = params.id as string;

  const [partner, setPartner] = useState<Partner | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [partnerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getIdToken();
      if (!token) throw new Error('Not authenticated');

      // Fetch partner info
      const partnerRes = await fetch(`/api/admin/organizations/${partnerId}`, {
        headers: { 'x-firebase-token': token },
      });
      if (!partnerRes.ok) {
        throw new Error('Failed to load partner information');
      }
      const partnerData = await partnerRes.json();
      // Response format: { success: true, organization: { id, name, ... } }
      setPartner({ id: partnerData.organization.id, name: partnerData.organization.name });

      // Fetch all deliveries
      const deliveriesRes = await fetch('/api/admin/data-intelligence', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!deliveriesRes.ok) {
        throw new Error('Failed to load deliveries');
      }
      const deliveriesData: DataIntelligenceData = await deliveriesRes.json();

      // Filter by partnerId
      const partnerDeliveries = deliveriesData.deliveries.filter(
        d => d.partnerId === partnerId
      );
      setDeliveries(partnerDeliveries);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary stats
  const summary = useMemo(() => {
    const totalVideos = deliveries.reduce((sum, d) => sum + d.videoCount, 0);
    const totalSize = deliveries.reduce((sum, d) => sum + d.sizeGB, 0);
    const count = deliveries.length;
    const dates = deliveries.map(d => new Date(d.date).getTime()).filter(Boolean);
    const firstDelivery = dates.length > 0 
      ? new Date(Math.min(...dates))
      : null;

    return {
      totalVideos,
      totalSize,
      count,
      firstDelivery,
    };
  }, [deliveries]);

  // Transform deliveries into cumulative chart data
  const chartData = useMemo(() => {
    if (deliveries.length < 2) {
      return [];
    }

    // Sort by date ascending
    const sorted = [...deliveries].sort((a, b) => {
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
  }, [deliveries]);

  // Sort deliveries by date descending for table
  const sortedDeliveries = useMemo(() => {
    return [...deliveries].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
  }, [deliveries]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Partner not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/admin')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{partner.name}</h1>
          <p className="text-gray-600">Delivery History</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Film className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-sm font-medium text-gray-600">
              Total Videos Delivered
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {summary.totalVideos.toLocaleString()}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <HardDrive className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-sm font-medium text-gray-600">
              Total Size
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {summary.totalSize.toFixed(1)} GB
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Package className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-sm font-medium text-gray-600">
              Number of Deliveries
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {summary.count}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-sm font-medium text-gray-600">
              First Delivery
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {summary.firstDelivery
              ? summary.firstDelivery.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : '—'}
          </div>
        </div>
      </div>

      {/* Delivery Trend Chart */}
      {chartData.length >= 2 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Trend</h2>
          <ResponsiveContainer width="100%" height={250}>
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
        </div>
      )}

      {/* Deliveries Table */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">All Deliveries</h2>
        {sortedDeliveries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No deliveries recorded for this partner
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Videos</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Size (GB)</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Description</th>
                </tr>
              </thead>
              <tbody>
                {sortedDeliveries.map((delivery) => (
                  <tr
                    key={delivery.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(delivery.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {delivery.videoCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {delivery.sizeGB.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {delivery.description || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


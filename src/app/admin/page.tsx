/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  MapPin, 
  Users, 
  ClipboardList,
  TrendingUp,
  Activity,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface AdminDashboardData {
  // Overview metrics
  totalOrganizations: number;
  totalLocations: number;
  totalTasks: number;
  totalTeleoperators: number;
  
  // Activity metrics (last 30 days)
  totalCompletions: number;
  totalSessions: number;
  totalWorkMinutes: number;
  avgCompletionsPerDay: number;
  
  // Today's activity
  completionsToday: number;
  sessionsToday: number;
  activeSessionsNow: number;
  
  // Top performers (last 30 days)
  topOrganizations: Array<{
    id: string;
    name: string;
    completions: number;
    sessions: number;
  }>;
  
  topTeleoperators: Array<{
    id: string;
    name: string;
    organizationName: string;
    completions: number;
    avgDuration: number;
  }>;
  
  topLocations: Array<{
    id: string;
    name: string;
    address: string;
    organizationName: string;
    completions: number;
  }>;
  
  // Recent activity
  recentCompletions: Array<{
    id: string;
    taskTitle: string;
    locationName: string;
    teleoperatorName: string;
    organizationName: string;
    completedAt: any; // Can be Firestore Timestamp, serialized timestamp, or Date
    status: string;
    duration: number;
  }>;
  
  recentSessions: Array<{
    id: string;
    locationName: string;
    teleoperatorName: string;
    organizationName: string;
    date: string;
    totalTasks: number;
    totalDuration: number;
  }>;
  
  // Problem areas
  locationsWithoutTasks: Array<{
    id: string;
    name: string;
    organizationName: string;
  }>;
  
  organizationsWithoutActivity: Array<{
    id: string;
    name: string;
    locationCount: number;
    lastActivity?: {
      toDate: () => Date;
    };
  }>;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { getIdToken } = useAuth();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadDashboardData();
  }, []);
  
  async function loadDashboardData() {
    try {
      const token = await getIdToken();
      const response = await fetch('/api/v1/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to load dashboard data');
      }
      
      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  }
  
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
        <p className="text-gray-600">Failed to load dashboard data</p>
      </div>
    );
  }
  
  const overviewMetrics = [
    {
      label: 'Organizations',
      value: data.totalOrganizations,
      icon: Building2,
      color: 'blue',
      link: '/admin/organizations',
    },
    {
      label: 'Locations',
      value: data.totalLocations,
      icon: MapPin,
      color: 'purple',
      link: '/admin/locations',
    },
    {
      label: 'Teleoperators',
      value: data.totalTeleoperators,
      icon: Users,
      color: 'green',
      link: '/admin/users',
    },
    {
      label: 'Total Tasks',
      value: data.totalTasks,
      icon: ClipboardList,
      color: 'orange',
      link: '/admin/locations',
    },
  ];
  
  const activityMetrics = [
    {
      label: 'Completions Today',
      value: data.completionsToday,
      icon: CheckCircle2,
      color: 'green',
      subtext: `${data.avgCompletionsPerDay}/day avg`,
    },
    {
      label: 'Sessions Today',
      value: data.sessionsToday,
      icon: Activity,
      color: 'blue',
      subtext: `${data.totalSessions} this month`,
    },
    {
      label: 'Total Work Time',
      value: `${Math.round(data.totalWorkMinutes / 60)}h`,
      icon: Clock,
      color: 'purple',
      subtext: 'Last 30 days',
    },
    {
      label: 'Active Now',
      value: data.activeSessionsNow,
      icon: TrendingUp,
      color: 'orange',
      subtext: 'Live sessions',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-500 uppercase tracking-wide font-medium mb-2">
          Admin
        </p>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Monitor operations at a glance and jump into areas that need attention.
        </p>
      </div>
      
      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <button
              key={metric.label}
              onClick={() => router.push(metric.link)}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow text-left group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  metric.color === 'blue' ? 'bg-blue-100' :
                  metric.color === 'purple' ? 'bg-purple-100' :
                  metric.color === 'green' ? 'bg-green-100' :
                  'bg-orange-100'
                }`}>
                  <Icon className={`h-6 w-6 ${
                    metric.color === 'blue' ? 'text-blue-600' :
                    metric.color === 'purple' ? 'text-purple-600' :
                    metric.color === 'green' ? 'text-green-600' :
                    'text-orange-600'
                  }`} />
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {metric.value}
              </div>
              <div className="text-sm text-gray-600">{metric.label}</div>
            </button>
          );
        })}
      </div>
      
      {/* Activity Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {activityMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="bg-white border border-gray-200 rounded-lg p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  metric.color === 'blue' ? 'bg-blue-100' :
                  metric.color === 'purple' ? 'bg-purple-100' :
                  metric.color === 'green' ? 'bg-green-100' :
                  'bg-orange-100'
                }`}>
                  <Icon className={`h-5 w-5 ${
                    metric.color === 'blue' ? 'text-blue-600' :
                    metric.color === 'purple' ? 'text-purple-600' :
                    metric.color === 'green' ? 'text-green-600' :
                    'text-orange-600'
                  }`} />
                </div>
                <div className="text-sm font-medium text-gray-600">
                  {metric.label}
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {metric.value}
              </div>
              <div className="text-xs text-gray-500">{metric.subtext}</div>
            </div>
          );
        })}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Top Performing Organizations
              </h3>
            </div>
          </div>
          <div className="p-6">
            {data.topOrganizations.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No activity yet
              </p>
            ) : (
              <div className="space-y-3">
                {data.topOrganizations.map((org, index) => (
                  <div
                    key={org.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => router.push(`/admin/organizations/${org.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-semibold text-sm">
                        #{index + 1}
                      </div>
              <div>
                        <p className="font-medium text-gray-900">{org.name}</p>
                        <p className="text-xs text-gray-500">
                          {org.sessions} sessions
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {org.completions}
                      </p>
                      <p className="text-xs text-gray-500">completions</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Recent Activity */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Recent Completions
              </h3>
            </div>
          </div>
          <div className="p-6">
            {data.recentCompletions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No recent activity
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentCompletions.slice(0, 5).map((completion) => (
                  <div
                    key={completion.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                      completion.status === 'completed' ? 'bg-green-100' :
                      completion.status === 'incomplete' ? 'bg-yellow-100' :
                      'bg-red-100'
                    }`}>
                      <CheckCircle2 className={`h-4 w-4 ${
                        completion.status === 'completed' ? 'text-green-600' :
                        completion.status === 'incomplete' ? 'text-yellow-600' :
                        'text-red-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {completion.taskTitle}
                      </p>
                      <p className="text-xs text-gray-500">
                        {completion.teleoperatorName} • {completion.locationName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatTimeAgo(parseTimestamp(completion.completedAt))}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-xs text-gray-600">
                      {completion.duration}m
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Problem Areas */}
      {(data.locationsWithoutTasks.length > 0 || data.organizationsWithoutActivity.length > 0) && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Areas Needing Attention
              </h3>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Locations without tasks */}
              {data.locationsWithoutTasks.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">
                    Locations Without Tasks ({data.locationsWithoutTasks.length})
                  </h4>
                  <div className="space-y-2">
                    {data.locationsWithoutTasks.map((location) => (
                      <div
                        key={location.id}
                        className="p-3 bg-orange-50 border border-orange-200 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors"
                        onClick={() => router.push(`/admin/locations/${location.id}`)}
                      >
                        <p className="font-medium text-gray-900 text-sm">
                          {location.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {location.organizationName}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Organizations without activity */}
              {data.organizationsWithoutActivity.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">
                    Inactive Organizations ({data.organizationsWithoutActivity.length})
                  </h4>
                  <div className="space-y-2">
                    {data.organizationsWithoutActivity.map((org) => (
                      <div
                        key={org.id}
                        className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors"
                        onClick={() => router.push(`/admin/organizations/${org.id}`)}
                      >
                        <p className="font-medium text-gray-900 text-sm">
                          {org.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {org.locationCount} locations • No recent activity
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/admin/organizations/new')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-left group"
            >
              <Building2 className="h-6 w-6 text-gray-400 group-hover:text-blue-600 mb-2" />
              <p className="font-medium text-gray-900 group-hover:text-blue-600">
                Add Organization
              </p>
              <p className="text-xs text-gray-500">
                Create a new organization
              </p>
            </button>
            
            <button
              onClick={() => router.push('/admin/locations/new')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors text-left group"
            >
              <MapPin className="h-6 w-6 text-gray-400 group-hover:text-purple-600 mb-2" />
              <p className="font-medium text-gray-900 group-hover:text-purple-600">
                Add Location
              </p>
              <p className="text-xs text-gray-500">
                Create a new location
              </p>
            </button>
            
            <button
              onClick={() => router.push('/admin/users/new')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors text-left group"
            >
              <Users className="h-6 w-6 text-gray-400 group-hover:text-green-600 mb-2" />
              <p className="font-medium text-gray-900 group-hover:text-green-600">
                Add User
              </p>
              <p className="text-xs text-gray-500">
                Invite a new team member
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function parseTimestamp(timestamp: any): Date {
  // If it's already a Date object
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  // If it has a toDate method (Firestore Timestamp)
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  // If it's a serialized Firestore timestamp with _seconds
  if (timestamp && typeof timestamp._seconds === 'number') {
    return new Date(timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1000000);
  }
  
  // If it's a string (ISO date)
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  
  // If it's a number (milliseconds)
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }
  
  // Fallback to current date
  return new Date();
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
}

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function DebugPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDebug() {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/admin/debug/media-count', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(await res.json());
      } catch (e: any) {
        setData({ error: e.message });
      }
      setLoading(false);
    }
    fetchDebug();
  }, [user]);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Media Debug</h1>
      <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

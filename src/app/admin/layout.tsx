"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { ToastProvider } from "@/components/ui/Toast";

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

function AccessDenied() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-[#0a0a0a] px-6 py-16 text-slate-900 dark:text-white">
      <Card className="w-full max-w-md border border-slate-200 dark:border-[#1f1f1f] shadow-sm dark:bg-[#141414]">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">Admin access required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600 dark:text-gray-400">
          <p>Your account does not have administrator privileges.</p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/properties">Return to properties</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, claims, initializing, loading, refreshClaims } = useAuth();
  const refreshedClaims = useRef(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  const role = useMemo(() => {
    if (!claims) return undefined;
    const rawRole = claims.role;
    return typeof rawRole === "string" ? rawRole : undefined;
  }, [claims]);

  // Load collapsed state from localStorage
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved !== null) {
      setCollapsed(saved === 'true');
    }
  }, []);

  // Save collapsed state
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    }
  }, [collapsed, mounted]);

  // Keyboard shortcut: Cmd/Ctrl + B
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setCollapsed(prev => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!user || initializing || refreshedClaims.current) {
      return;
    }
    refreshedClaims.current = true;
    void refreshClaims();
  }, [user, initializing, refreshClaims]);

  useEffect(() => {
    if (initializing) {
      return;
    }
    if (!user) {
      router.replace("/login");
    }
  }, [user, initializing, router]);

  // Support both old "admin" role and new role system
  const isAdmin = role === "admin" || role === "superadmin" || role === "partner_admin";

  // Get section name from pathname
  const sectionNames: Record<string, string> = {
    '/admin': 'DATA INTELLIGENCE',
    '/admin/users': 'USERS',
    '/admin/organizations': 'ORGANIZATIONS',
    '/admin/locations': 'LOCATIONS',
    '/admin/robot-intelligence': 'ROBOT INTELLIGENCE',
    '/admin/robot-intelligence/media': 'MEDIA LIBRARY',
    '/admin/robot-intelligence/training': 'TRAINING LIBRARY',
    '/admin/exports': 'EXPORTS',
    '/admin/settings': 'SETTINGS',
  };
  
  // Match exact or prefix (for nested routes like /admin/locations/[id])
  const currentSection = sectionNames[pathname] || 
    Object.entries(sectionNames).find(([path]) => pathname.startsWith(path + '/'))?.[1] || 
    'ADMIN';

  if (initializing || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full" />
      </main>
    );
  }

  if (!user) {
    return null; // redirect handled above
  }

  if (!isAdmin) {
    return <AccessDenied />;
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
        <AdminHeader 
          collapsed={collapsed} 
          onToggleSidebar={() => setCollapsed(!collapsed)}
          currentSection={currentSection}
        />
        <div className="flex">
          <AdminSidebar collapsed={collapsed} />
          <main 
            className={`flex-1 transition-all duration-200 pt-16 ${
              collapsed ? 'ml-[72px]' : 'ml-[256px]'
            }`}
          >
            <div className="p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

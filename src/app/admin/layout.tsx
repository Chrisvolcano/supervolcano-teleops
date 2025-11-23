"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminNav } from "@/components/admin/AdminNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

function AccessDenied() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 py-16 text-slate-900">
      <Card className="w-full max-w-md border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-900">Admin access required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
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

  const role = useMemo(() => {
    if (!claims) return undefined;
    const rawRole = claims.role;
    return typeof rawRole === "string" ? rawRole : undefined;
  }, [claims]);

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

  if (initializing || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AdminHeader />
      <div className="mx-auto flex w-full max-w-7xl gap-8 px-6 py-10">
        <AdminNav />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

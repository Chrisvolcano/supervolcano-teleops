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
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 px-6 py-16 text-neutral-900">
      <Card className="w-full max-w-md border-neutral-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Admin access required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-neutral-600">
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

  const isAdmin = role === "admin";

  if (initializing || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50">
        <p className="text-sm text-neutral-500">Loading admin portal…</p>
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
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <AdminHeader />
      <div className="mx-auto flex w-full max-w-7xl gap-8 px-6 py-10">
        <AdminNav />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

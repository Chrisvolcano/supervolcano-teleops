"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminNav } from "@/components/admin/AdminNav";
import { useAuth } from "@/hooks/useAuth";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, claims, loading, refreshClaims } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (loading) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      const currentRole = (claims?.role as string | undefined) ?? null;
      if (currentRole === "admin") {
        if (!cancelled) {
          setIsAdmin(true);
          setChecking(false);
        }
        return;
      }

      try {
        const refreshed = await refreshClaims(true);
        const refreshedRole = (refreshed?.role as string | undefined) ?? null;
        if (refreshedRole === "admin") {
          if (!cancelled) {
            setIsAdmin(true);
            setChecking(false);
          }
          return;
        }
      } catch (error) {
        console.error("Failed to refresh user claims", error);
      }

      if (!cancelled) {
        setIsAdmin(false);
        setChecking(false);
        router.replace("/admin/no-access");
      }
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [user, claims, loading, router, refreshClaims]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 text-neutral-900">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <AdminHeader />
      <div className="mx-auto flex w-full max-w-7xl gap-8 px-6 py-10">
        <Suspense
          fallback={
            <nav className="hidden w-56 flex-shrink-0 lg:block">
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-10 animate-pulse rounded-lg bg-neutral-100" />
                ))}
              </div>
            </nav>
          }
        >
          <AdminNav />
        </Suspense>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

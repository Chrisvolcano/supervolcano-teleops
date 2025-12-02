"use client";

/**
 * Teleoperator Layout
 * Protects routes and ensures user is logged in as teleoperator
 */

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function TeleoperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, claims, loading, initializing } = useAuth();

  useEffect(() => {
    // Wait for auth to initialize
    if (initializing || loading) {
      return;
    }

    // Redirect to login if not authenticated
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // Check if user is a teleoperator
    const role = claims?.role as string | undefined;
    if (role !== "oem_teleoperator") {
      router.push("/no-access");
      return;
    }
  }, [user, claims, loading, initializing, router, pathname]);

  // Show loading state while checking auth
  if (initializing || loading || !user || claims?.role !== "oem_teleoperator") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}


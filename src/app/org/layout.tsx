"use client";

/**
 * Unified Organization Portal Layout
 * Serves both org_manager and teleoperator roles with role-based navigation
 */

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Toaster } from "react-hot-toast";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type NavLinkProps = {
  href: string;
  active: boolean;
  children: React.ReactNode;
};

function NavLink({ href, active, children }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
        active
          ? "bg-slate-100 text-slate-900"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
      }`}
    >
      {children}
    </Link>
  );
}

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, claims, getIdToken, logout } = useAuth();
  const [currentUser, setCurrentUser] = useState<{
    role: string;
    organizationId?: string;
    organizationName?: string;
    displayName?: string;
    email?: string;
    teleoperatorId?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function loadUser() {
      if (!user || !claims) {
        router.push("/login");
        return;
      }

      const role = claims.role as string;

      // Check if user has organization access
      if (role !== "org_manager" && role !== "oem_teleoperator") {
        // Redirect admins to admin portal
        if (role === "superadmin" || role === "admin" || role === "partner_admin") {
          router.push("/admin");
        } else {
          router.push("/login");
        }
        return;
      }

      // Check if user has organizationId
      if (!claims.organizationId) {
        router.push("/login");
        return;
      }

      try {
        // Get full user info from API
        const token = await getIdToken();
        if (!token) {
          router.push("/login");
          return;
        }

        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          router.push("/login");
          return;
        }

        const userData = await response.json();
        setCurrentUser(userData);
      } catch (error) {
        console.error("Auth error:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    if (user && claims) {
      loadUser();
    } else if (!user) {
      router.push("/login");
    }
  }, [user, claims, router, getIdToken]);

  if (loading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const isManager = currentUser.role === "org_manager";
  const isTeleoperator = currentUser.role === "oem_teleoperator";

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50">
        {/* Top Navigation Bar */}
        <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center flex-1">
                {/* Mobile menu button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  aria-label="Toggle menu"
                  aria-expanded={mobileMenuOpen}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    {mobileMenuOpen ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    )}
                  </svg>
                </button>

                {/* Logo/Org Name */}
                <div className="flex-shrink-0 flex items-center ml-2 md:ml-0">
                  <div>
                    <h1 className="text-lg font-semibold text-slate-900">
                      {currentUser.organizationName || "Organization Portal"}
                    </h1>
                    <p className="text-xs text-slate-500 hidden sm:block">
                      {isManager ? "Manager Portal" : "Teleoperator Portal"}
                    </p>
                  </div>
                </div>

                {/* Desktop Navigation Links */}
                <div className="hidden md:ml-6 md:flex md:space-x-8">
                  <NavLink href="/org/dashboard" active={pathname === "/org/dashboard"}>
                    {isManager ? "📊 Dashboard" : "🏠 Home"}
                  </NavLink>

                  <NavLink href="/org/locations" active={pathname.startsWith("/org/locations")}>
                    📍 Locations
                  </NavLink>

                  {isManager && (
                    <NavLink href="/org/team" active={pathname === "/org/team"}>
                      👥 Team
                    </NavLink>
                  )}

                  <NavLink href="/org/tasks" active={pathname === "/org/tasks"}>
                    {isManager ? "📋 Task History" : "✅ My Tasks"}
                  </NavLink>
                </div>
              </div>

              {/* User Menu */}
              <div className="flex items-center gap-2 md:gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-slate-900">
                    {currentUser.displayName || currentUser.email}
                  </p>
                  <p className="text-xs text-slate-500">{isManager ? "Manager" : "Teleoperator"}</p>
                </div>

                <button
                  onClick={async () => {
                    await logout();
                  }}
                  className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                  aria-label="Sign out"
                >
                  <span className="hidden sm:inline">Sign Out</span>
                  <span className="sm:hidden">Out</span>
                </button>
              </div>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
              <div className="md:hidden border-t border-slate-200 bg-white">
                <div className="px-2 pt-2 pb-3 space-y-1">
                  <Link
                    href="/org/dashboard"
                    className={`flex items-center px-3 py-2 text-base font-medium rounded-md ${
                      pathname === "/org/dashboard"
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {isManager ? "📊 Dashboard" : "🏠 Home"}
                  </Link>
                  <Link
                    href="/org/locations"
                    className={`flex items-center px-3 py-2 text-base font-medium rounded-md ${
                      pathname.startsWith("/org/locations")
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    📍 Locations
                  </Link>
                  {isManager && (
                    <Link
                      href="/org/team"
                      className={`flex items-center px-3 py-2 text-base font-medium rounded-md ${
                        pathname === "/org/team"
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      👥 Team
                    </Link>
                  )}
                  <Link
                    href="/org/tasks"
                    className={`flex items-center px-3 py-2 text-base font-medium rounded-md ${
                      pathname === "/org/tasks"
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {isManager ? "📋 Task History" : "✅ My Tasks"}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">{children}</main>

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: '#1e293b',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#1e293b',
              },
            },
          }}
        />
      </div>
    </ErrorBoundary>
  );
}

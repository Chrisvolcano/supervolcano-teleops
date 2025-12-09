"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  Settings,
  Users,
  MapPin,
  UserCheck,
  Database,
  Film,
  GraduationCap,
  Upload,
  Package,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Organizations", href: "/admin/organizations", icon: Building2 },
  { label: "Locations", href: "/admin/locations", icon: MapPin },
  { label: "Robot Intelligence", href: "/admin/robot-intelligence", icon: Database },
  { label: "Media Library", href: "/admin/robot-intelligence/media", icon: Film },
  { label: "Training Library", href: "/admin/robot-intelligence/training", icon: GraduationCap },
  { label: "Contributions", href: "/admin/contributions", icon: Upload },
  { label: "Exports", href: "/admin/exports", icon: Package },
  { label: "Settings", href: "/admin/settings", icon: Settings },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  const { claims, loading, initializing } = useAuth();

  if (loading || initializing) {
    return (
      <nav className="hidden w-56 flex-shrink-0 lg:block">
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      </nav>
    );
  }

  // Show nav for admin, superadmin, or partner_admin
  const isAdmin = claims?.role === "admin" || claims?.role === "superadmin" || claims?.role === "partner_admin";
  if (!isAdmin) {
    return null;
  }

  return (
    <nav role="navigation" aria-label="Admin" className="hidden w-56 flex-shrink-0 lg:block">
      <ul className="space-y-1 text-sm">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isDashboard = href === "/admin";
          const isActive = isDashboard ? pathname === "/admin" : pathname.startsWith(href);

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-3 py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400",
                  "hover:translate-x-0.5 hover:bg-neutral-100",
                  isActive && "bg-neutral-900 text-white hover:bg-neutral-900",
                )}
              >
                <Icon className="h-4 w-4 transition group-hover:scale-105" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

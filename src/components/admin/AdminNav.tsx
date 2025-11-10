"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Properties", href: "/admin/properties", icon: Building2 },
  { label: "Tasks", href: "/admin/tasks", icon: ClipboardList },
  { label: "Sessions", href: "/admin/sessions", icon: Users },
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

  if ((claims?.role as string | undefined) !== "admin") {
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

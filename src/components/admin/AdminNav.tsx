"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Building2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Properties", href: "/admin?section=properties", icon: Building2 },
  { label: "Tasks", href: "/admin?section=tasks", icon: ClipboardList },
  { label: "Sessions", href: "/admin?section=sessions", icon: Users },
  { label: "Audit", href: "/admin?section=audit", icon: FileText },
  { label: "Settings", href: "/admin?section=settings", icon: ShieldCheck },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const section = searchParams?.get("section") ?? "properties";

  return (
    <nav className="hidden w-56 flex-shrink-0 lg:block">
      <ul className="space-y-1 text-sm">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isRoot = href === "/admin";
          const isActive = isRoot
            ? pathname === "/admin" && section === "properties"
            : pathname === "/admin" && href.includes(`section=${section}`);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-neutral-100",
                  isActive && "bg-neutral-900 text-white hover:bg-neutral-900",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

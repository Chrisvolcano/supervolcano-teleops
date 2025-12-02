"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function OrgHeader() {
  const { user, claims, logout } = useAuth();
  const role = (claims?.role as string | undefined) ?? "oem_teleoperator";
  const organizationName = (claims?.organizationName as string | undefined) || "Organization";

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/org/dashboard" className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-500">
            SuperVolcano
          </Link>
          <div className="hidden items-center gap-4 text-sm text-neutral-500 md:flex">
            <span className="font-medium text-neutral-900">{organizationName}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="text-right">
            <p className="font-medium text-neutral-900">{user?.email ?? "Unknown user"}</p>
            <p className="text-xs uppercase tracking-wider text-neutral-500">
              {role === "org_manager" ? "Manager" : "Teleoperator"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => logout().catch(() => undefined)}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}


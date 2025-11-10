"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function AdminHeader() {
  const { user, claims, logout } = useAuth();
  const role = (claims?.role as string | undefined) ?? "operator";

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-500">
            SuperVolcano
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-neutral-500 md:flex">
            {role === "admin" && (
              <Link href="/admin" className="font-medium text-neutral-900">
                Admin
              </Link>
            )}
            <Link href="/docs" className="transition hover:text-neutral-900">
              Docs
            </Link>
            <Link href="mailto:tony@supervolcano.ai" className="transition hover:text-neutral-900">
              Support
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="text-right">
            <p className="font-medium text-neutral-900">{user?.email ?? "Unknown user"}</p>
            <p className="text-xs uppercase tracking-wider text-neutral-500">{role}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => logout().catch(() => undefined)}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}

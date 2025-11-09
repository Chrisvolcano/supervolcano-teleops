import type { ReactNode } from "react";
import { Suspense } from "react";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminLayout({ children }: { children: ReactNode }) {
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

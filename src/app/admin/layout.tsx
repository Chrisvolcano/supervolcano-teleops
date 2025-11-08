import type { ReactNode } from "react";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminLayout({ children }: { children: ReactNode }) {
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

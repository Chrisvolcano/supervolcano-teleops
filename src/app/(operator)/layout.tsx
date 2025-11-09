import type { ReactNode } from "react";

import { OperatorHeader } from "@/components/operator/OperatorHeader";

export default function OperatorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <OperatorHeader />
      <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}

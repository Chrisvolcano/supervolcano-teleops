import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function AdminNoAccessPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center gap-4 px-4 text-center text-neutral-700">
      <h1 className="text-2xl font-semibold text-neutral-900">Admin access required</h1>
      <p className="text-sm">
        Your account does not have permission to view the admin console. If you believe this is an error, contact an administrator.
      </p>
      <Button asChild>
        <Link href="/properties">Go to operator portal</Link>
      </Button>
    </main>
  );
}

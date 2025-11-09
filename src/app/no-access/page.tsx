import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NoAccessPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center gap-4 px-4 text-center text-neutral-700">
      <h1 className="text-2xl font-semibold text-neutral-900">You don&apos;t have access</h1>
      <p className="text-sm">
        The page you requested is restricted. Please return to the operator portal or contact support if you believe this is a mistake.
      </p>
      <Button asChild>
        <Link href="/properties">Go to operator portal</Link>
      </Button>
    </main>
  );
}

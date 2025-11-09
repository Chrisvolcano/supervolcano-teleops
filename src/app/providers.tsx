"use client";

import { Toaster } from "@/components/common/Toaster";
import { AuthProvider } from "@/hooks/useAuth";

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      {children}
      <Toaster />
    </AuthProvider>
  );
}


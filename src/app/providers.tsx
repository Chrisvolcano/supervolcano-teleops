"use client";

import { Toaster } from "@/components/common/Toaster";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "next-themes";

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}


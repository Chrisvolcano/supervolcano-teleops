"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const { user, claims, login, logout, loading, initializing, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Determine redirect URL based on role
  const getRedirectUrl = () => {
    const role = claims?.role as string | undefined;
    if (role === "superadmin" || role === "partner_admin" || role === "admin") {
      return "/admin";
    } else if (role === "org_manager" || role === "oem_teleoperator") {
      return "/org/dashboard";
    }
    return "/properties";
  };

  if (user) {
    const redirectUrl = getRedirectUrl();
    return (
      <main className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl font-semibold text-gray-900">
              You&apos;re already signed in
            </CardTitle>
            <CardDescription className="text-gray-600">
              Signed in as {user.email ?? "your account"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full bg-gray-900 text-white hover:bg-gray-800">
              <Link href={redirectUrl}>Go to dashboard</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => logout().catch(() => undefined)}
              disabled={loading || submitting}
            >
              Sign out
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to sign in. Try again.";
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <CardHeader className="space-y-3 text-center p-8">
          <div className="flex flex-col items-center gap-2">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 rounded-lg mb-6">
              <span className="text-2xl">⚡</span>
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
              Teleoperator Portal
            </CardTitle>
          </div>
          <CardDescription className="text-gray-600">
            Sign in to view properties, review session logs, and&nbsp;review&nbsp;tasks.
          </CardDescription>
          {initializing && (
            <p className="text-xs text-gray-500">Checking your session…</p>
          )}
        </CardHeader>
        <CardContent className="p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@supervolcano.ai"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={submitting}
                  className="w-full pl-10 pr-3 py-3 bg-white border border-gray-300 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={submitting}
                  className="w-full pl-3 pr-10 py-3 bg-white border border-gray-300 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 transition-colors z-10"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {(error || formError) && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {formError ?? error ?? "Authentication error"}
              </p>
            )}
            <Button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center px-8 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-sm text-center text-gray-600">
            Need access? Contact{" "}
            <Link
              href="mailto:tony@supervolcano.ai?subject=Teleoperator%20Access%20Request"
              className="font-medium text-gray-900 hover:text-gray-700 transition-colors"
            >
              tony@supervolcano.ai
            </Link>
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}


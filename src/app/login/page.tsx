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
  const { user, login, logout, loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-neutral-100 to-neutral-200 px-4 py-12 text-neutral-900">
        <Card className="w-full max-w-md border-neutral-200 bg-white shadow-xl">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl font-semibold text-neutral-900">
              You're already signed in
            </CardTitle>
            <CardDescription className="text-neutral-500">
              Signed in as {user.email ?? "your account"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full bg-neutral-900 text-white hover:bg-neutral-800">
              <Link href="/properties">Go to properties</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => logout().catch(() => undefined)}
              disabled={loading}
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
    try {
      await login(email, password);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to sign in. Try again.";
      setFormError(message);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-neutral-100 to-neutral-200 px-4 py-12 text-neutral-900">
      <Card className="w-full max-w-md border-neutral-200 bg-white shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs uppercase tracking-[0.4em] text-neutral-500">
              SuperVolcano
            </span>
            <CardTitle className="text-3xl font-semibold tracking-tight text-neutral-900">
              Teleoperator Portal
            </CardTitle>
          </div>
          <CardDescription className="text-neutral-500">
            Sign in to view properties, review session logs, and review tasks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@supervolcano.ai"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-2 flex items-center text-sm font-medium text-neutral-500 hover:text-neutral-900"
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
              className="w-full bg-neutral-900 text-white hover:bg-neutral-800"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-xs text-neutral-500">
          <span>
            Need access? Contact{" "}
            <Link
              href="mailto:tony@supervolcano.ai?subject=Teleoperator%20Access%20Request"
              className="font-medium text-neutral-900 underline-offset-2 hover:underline"
            >
              tony@supervolcano.ai
            </Link>
          </span>
        </CardFooter>
      </Card>
    </main>
  );
}


"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useCollection";

export default function AdminDashboardPage() {
  const { claims } = useAuth();
  const role = (claims?.role as string | undefined) ?? "operator";
  const isAdmin = role === "admin";

  const { data: properties } = useCollection({ path: "locations", enabled: isAdmin });
 
  const { data: tasks } = useCollection({ path: "tasks", enabled: isAdmin });
 
  const { data: sessions } = useCollection({ path: "sessions", enabled: isAdmin });

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-widest text-neutral-400">Admin</p>
        <h1 className="text-3xl font-semibold text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-500">
          Monitor operations at a glance and jump into the areas that need attention.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-neutral-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-neutral-500">Active properties</CardTitle>
          </CardHeader>
          <CardContent className="flex items-baseline justify-between gap-2">
            <span className="text-3xl font-semibold text-neutral-900">
              {properties.length}
            </span>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/properties">Manage</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-neutral-500">Open tasks</CardTitle>
          </CardHeader>
          <CardContent className="flex items-baseline justify-between gap-2">
            <span className="text-3xl font-semibold text-neutral-900">
              {tasks.filter((task) => task.status !== "completed").length}
            </span>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/tasks">Review</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-neutral-500">Sessions tracked</CardTitle>
          </CardHeader>
          <CardContent className="flex items-baseline justify-between gap-2">
            <span className="text-3xl font-semibold text-neutral-900">
              {sessions.length}
            </span>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/sessions">Inspect</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-neutral-200">
          <CardHeader>
            <CardTitle>Get set up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-neutral-600">
            <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <div>
                <p className="font-medium text-neutral-900">Review property readiness</p>
                <p className="text-xs text-neutral-500">Ensure every location has media and task plan.</p>
              </div>
              <Button asChild size="sm">
                <Link href="/admin/properties">Open properties</Link>
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <div>
                <p className="font-medium text-neutral-900">Audit task templates</p>
                <p className="text-xs text-neutral-500">Assign difficulty and owners in the tasks view.</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/tasks">Open tasks</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardHeader>
            <CardTitle>Recent guidance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-neutral-600">
            <p className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4">
              Sessions are now reviewed in the new Sessions tab. Edit QC ratings and review robot vs human split in one place.
            </p>
            <p className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4">
              Operators can leave notes per property. Check the properties detail view for the latest context.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}


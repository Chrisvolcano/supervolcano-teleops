"use client";

import { useState } from "react";
import toast from "react-hot-toast";

import { useEffect } from "react";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useCollection";
import { useDoc } from "@/hooks/useDoc";
import { firestore } from "@/lib/firebaseClient";
import { doc, setDoc } from "firebase/firestore";

const defaultSettings = {
  difficultyColors: {
    easy: "#ecfdf5",
    mid: "#fef9c3",
    high: "#fee2e2",
  },
  requireQcOnClose: false,
  defaultHours: {
    start: "08:00",
    end: "18:00",
    timezone: "America/Los_Angeles",
  },
};

type PortalSettings = typeof defaultSettings;

type UserRecord = {
  id: string;
  email: string;
  role: string;
  partnerOrgId?: string | null;
};

export function SettingsForms() {
  const { getIdToken, refreshClaims, user } = useAuth();
  const [roleChangeLoading, setRoleChangeLoading] = useState<string | null>(null);

  const {
    data: users,
    loading: usersLoading,
    error: usersError,
  } = useCollection<UserRecord>({
    path: "users",
    enabled: true,
    parse: (doc) =>
      ({
        id: doc.id,
        email: doc.email ?? "unknown",
        role: doc.role ?? "operator",
        partnerOrgId: doc.partnerOrgId ?? null,
      }) as UserRecord,
  });

  const {
    data: settingsDoc,
    loading: settingsLoading,
  } = useDoc<PortalSettings>({
    path: "settings",
    docId: "general",
    enabled: true,
    parse: (doc) => ({
      difficultyColors: {
        easy: doc.difficultyColors?.easy ?? defaultSettings.difficultyColors.easy,
        mid: doc.difficultyColors?.mid ?? defaultSettings.difficultyColors.mid,
        high: doc.difficultyColors?.high ?? defaultSettings.difficultyColors.high,
      },
      requireQcOnClose: doc.requireQcOnClose ?? defaultSettings.requireQcOnClose,
      defaultHours: {
        start: doc.defaultHours?.start ?? defaultSettings.defaultHours.start,
        end: doc.defaultHours?.end ?? defaultSettings.defaultHours.end,
        timezone: doc.defaultHours?.timezone ?? defaultSettings.defaultHours.timezone,
      },
    }),
  });

  const [colorDraft, setColorDraft] = useState(defaultSettings.difficultyColors);
  const [hoursDraft, setHoursDraft] = useState(defaultSettings.defaultHours);
  const [savingColors, setSavingColors] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [savingQcToggle, setSavingQcToggle] = useState(false);
  const [exportRange, setExportRange] = useState({ from: "", to: "" });

  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "Unknown";

  useEffect(() => {
    if (settingsDoc) {
      setColorDraft(settingsDoc.difficultyColors);
      setHoursDraft(settingsDoc.defaultHours);
    }
  }, [settingsDoc]);

  async function handleRoleChange(email: string, role: string, partnerOrgId: string | null) {
    try {
      setRoleChangeLoading(email);
      const token = await getIdToken();
      if (!token) throw new Error("Auth token missing");
      const response = await fetch("/api/admin/promote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, role, partner_org_id: partnerOrgId }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Unable to update role");
      }
      toast.success(`Role updated to ${role}`);
      if (user?.email === email) {
        await refreshClaims(true);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role");
    } finally {
      setRoleChangeLoading(null);
    }
  }

  async function handleSaveColors() {
    setSavingColors(true);
    try {
      await setDoc(doc(firestore, "settings", "general"), { difficultyColors: colorDraft }, { merge: true });
      toast.success("Difficulty colors updated");
    } catch (error) {
      toast.error("Unable to update colors");
      console.error(error);
    } finally {
      setSavingColors(false);
    }
  }

  async function handleSaveHours() {
    setSavingHours(true);
    try {
      await setDoc(doc(firestore, "settings", "general"), { defaultHours: hoursDraft }, { merge: true });
      toast.success("Default hours updated");
    } catch (error) {
      toast.error("Unable to update hours");
      console.error(error);
    } finally {
      setSavingHours(false);
    }
  }

  async function handleToggleRequireQc(require: boolean) {
    setSavingQcToggle(true);
    try {
      await setDoc(doc(firestore, "settings", "general"), { requireQcOnClose: require }, { merge: true });
      toast.success(require ? "QC requirement enabled" : "QC requirement disabled");
    } catch (error) {
      toast.error("Unable to update QC requirement");
      console.error(error);
    } finally {
      setSavingQcToggle(false);
    }
  }

  async function handleRecount(templateId?: string) {
    try {
      const token = await getIdToken();
      const url = templateId ? `/api/admin/taskCounters/recount?templateId=${templateId}` : "/api/admin/taskCounters/recount";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to recount counters");
      }
      toast.success("Template counters updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Recount failed");
    }
  }

  function handleExportCsv() {
    const params = new URLSearchParams();
    if (exportRange.from) params.set("from", exportRange.from);
    if (exportRange.to) params.set("to", exportRange.to);
    const url = `/api/admin/sessions/export${params.toString() ? `?${params.toString()}` : ""}`;
    window.open(url, "_blank");
  }

  return (
    <div className="space-y-8">
      <section>
        <Card className="border-neutral-200">
          <CardHeader>
            <CardTitle>Partner &amp; Roles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {usersError ? (
              <EmptyState title="Unable to load users" description={usersError} />
            ) : usersLoading ? (
              <p className="text-sm text-neutral-500">Loading users…</p>
            ) : users.length ? (
              <div className="space-y-2 text-sm">
                {users.map((account) => (
                  <div
                    key={account.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-neutral-900">{account.email}</p>
                      <p className="text-xs text-neutral-500">Role: {account.role}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRoleChange(account.email, "operator", account.partnerOrgId ?? null)}
                        disabled={roleChangeLoading === account.email || account.role === "operator"}
                      >
                        Make operator
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleRoleChange(account.email, "admin", account.partnerOrgId ?? null)}
                        disabled={roleChangeLoading === account.email || account.role === "admin"}
                      >
                        Promote to admin
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No users" description="Invite teammates to see them listed here." />
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-neutral-200">
          <CardHeader>
            <CardTitle>Task taxonomy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-neutral-500">Configure color tags for difficulty levels.</p>
            <div className="grid gap-4 md:grid-cols-3">
              {(["easy", "mid", "high"] as const).map((level) => (
                <div key={level} className="space-y-2">
                  <Label className="capitalize">{level}</Label>
                  <Input
                    type="color"
                    value={colorDraft[level]}
                    onChange={(event) => setColorDraft((prev) => ({ ...prev, [level]: event.target.value }))}
                  />
                </div>
              ))}
            </div>
            <Button onClick={handleSaveColors} disabled={savingColors}>
              {savingColors ? "Saving…" : "Update colors"}
            </Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-neutral-200">
          <CardHeader>
            <CardTitle>Operations defaults</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-neutral-900">Require QC rating on close-out</p>
                <p className="text-xs text-neutral-500">Operators must provide a rating before completing sessions.</p>
              </div>
              <Switch
                checked={settingsDoc?.requireQcOnClose ?? false}
                onCheckedChange={(checked) => handleToggleRequireQc(Boolean(checked))}
                disabled={savingQcToggle}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="hours-start">Start hour</Label>
                <Input
                  id="hours-start"
                  type="time"
                  value={hoursDraft.start}
                  onChange={(event) => setHoursDraft((prev) => ({ ...prev, start: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hours-end">End hour</Label>
                <Input
                  id="hours-end"
                  type="time"
                  value={hoursDraft.end}
                  onChange={(event) => setHoursDraft((prev) => ({ ...prev, end: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hours-tz">Timezone</Label>
                <Input
                  id="hours-tz"
                  value={hoursDraft.timezone}
                  onChange={(event) => setHoursDraft((prev) => ({ ...prev, timezone: event.target.value }))}
                />
              </div>
            </div>
            <Button onClick={handleSaveHours} disabled={savingHours}>
              {savingHours ? "Saving…" : "Save defaults"}
            </Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-neutral-200">
          <CardHeader>
            <CardTitle>Storage &amp; media</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-neutral-600">
            <p>Bucket: {bucketName}</p>
            <p>Usage metrics are not available in this environment.</p>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-neutral-200">
          <CardHeader>
            <CardTitle>Dangerous</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-neutral-900">Recount task template counters</p>
                <p className="text-xs text-neutral-500">Rebuild assignment and completion totals from task history.</p>
              </div>
              <ConfirmDialog
                title="Recount template stats"
                description="This recomputes usage for every template. Proceed?"
                confirmLabel="Recount"
                destructive
                onConfirm={() => handleRecount()}
              >
                <Button variant="destructive" size="sm">
                  Recount all
                </Button>
              </ConfirmDialog>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
              <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-900">Export sessions CSV</p>
                <p className="text-xs text-neutral-500">Choose an optional range and export QC data for audits.</p>
                <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-600">
                  <label className="flex items-center gap-2">
                    From
                    <Input
                      type="date"
                      value={exportRange.from}
                      onChange={(event) => setExportRange((prev) => ({ ...prev, from: event.target.value }))}
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    To
                    <Input
                      type="date"
                      value={exportRange.to}
                      onChange={(event) => setExportRange((prev) => ({ ...prev, to: event.target.value }))}
                    />
                  </label>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportCsv}>
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

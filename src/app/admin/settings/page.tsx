import { SettingsForms } from "@/components/admin/SettingsForms";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-widest text-neutral-400">Admin / Settings</p>
        <h1 className="text-3xl font-semibold text-neutral-900">Settings</h1>
        <p className="text-sm text-neutral-500">
          Manage roles, defaults, and operational controls for the teleoperator portal.
        </p>
      </header>
      <SettingsForms />
    </div>
  );
}

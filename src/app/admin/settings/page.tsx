import { SettingsForms } from "@/components/admin/SettingsForms";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-widest text-neutral-400 dark:text-gray-500">Admin / Settings</p>
        <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white">Settings</h1>
        <p className="text-sm text-neutral-500 dark:text-gray-400">
          Manage roles, defaults, and operational controls for the teleoperator portal.
        </p>
      </header>
      <SettingsForms />
    </div>
  );
}

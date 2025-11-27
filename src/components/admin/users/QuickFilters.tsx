/**
 * QUICK FILTERS COMPONENT
 * Preset filter buttons for common queries
 */

"use client";

import { CheckCircle, AlertCircle, Users, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserFilters } from "@/domain/user/user.types";

interface QuickFiltersProps {
  onFilterChange: (filters: UserFilters) => void;
}

export function QuickFilters({ onFilterChange }: QuickFiltersProps) {
  const filters = [
    {
      label: "All Users",
      icon: Users,
      filter: {},
    },
    {
      label: "Synced",
      icon: CheckCircle,
      filter: { syncStatus: "synced" as const },
      color: "text-green-600 bg-green-50 border-green-200 hover:bg-green-100",
    },
    {
      label: "Need Sync",
      icon: AlertCircle,
      filter: { syncStatus: "mismatched" as const },
      color: "text-yellow-600 bg-yellow-50 border-yellow-200 hover:bg-yellow-100",
    },
    {
      label: "Field Workers",
      icon: Users,
      filter: { role: "oem_teleoperator" as const }, // Show OEM teleoperators by default, parent can handle multi-role
      color: "text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100",
    },
    {
      label: "Org Managers",
      icon: Building2,
      filter: { role: "org_manager" as const },
      color: "text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100",
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((item) => {
        const Icon = item.icon;
        return (
          <Button
            key={item.label}
            variant="outline"
            size="sm"
            onClick={() => onFilterChange(item.filter)}
            className={`flex items-center gap-2 ${item.color || ""}`}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </Button>
        );
      })}
    </div>
  );
}

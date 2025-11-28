/**
 * QUICK FILTERS COMPONENT
 * Preset filter buttons for common queries
 */

"use client";

import {
  CheckCircle,
  AlertCircle,
  Users,
  Building2,
  Shield,
  Briefcase,
  Radio,
  Home,
} from "lucide-react";
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
      label: "Sync Issues",
      icon: AlertCircle,
      filter: { syncStatus: "mismatched" as const },
      color: "text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100",
    },
    {
      label: "Admins",
      icon: Shield,
      filter: { role: "admin" as const },
      color: "text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100",
    },
    {
      label: "Partner Managers",
      icon: Briefcase,
      filter: { role: "partner_manager" as const },
      color: "text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100",
    },
    {
      label: "Location Owners",
      icon: Building2,
      filter: { role: "location_owner" as const },
      color: "text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100",
    },
    {
      label: "OEM Teleoperators",
      icon: Radio,
      filter: { role: "oem_teleoperator" as const },
      color: "text-cyan-600 bg-cyan-50 border-cyan-200 hover:bg-cyan-100",
    },
    {
      label: "Location Cleaners",
      icon: Home,
      filter: { role: "location_cleaner" as const },
      color: "text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100",
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

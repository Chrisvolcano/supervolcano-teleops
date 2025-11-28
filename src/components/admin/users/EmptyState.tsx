"use client";

import { Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="text-center py-16 bg-gradient-to-br from-neutral-50 to-blue-50 rounded-lg border-2 border-dashed border-neutral-300">
      <div className="flex justify-center mb-4" aria-hidden="true">
        <Users className="w-12 h-12 text-neutral-400" />
      </div>
      <h3 className="text-xl font-semibold text-neutral-900 mb-2">
        No users found
      </h3>
      <p className="text-neutral-600 mb-6 max-w-md mx-auto">
        No users match your current filters. Try adjusting your search or filters to see more results.
      </p>
      <Button
        onClick={onRefresh}
        variant="outline"
        className="gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Refresh
      </Button>
    </div>
  );
}


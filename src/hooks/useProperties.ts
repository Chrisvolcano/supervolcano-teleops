import { useEffect, useMemo, useState } from "react";

import { watchProperties } from "@/lib/repositories/propertiesRepo";
import type { SVProperty } from "@/lib/types";

type Options = {
  partnerOrgId?: string;
  includeInactive?: boolean;
  enabled?: boolean;
};

export function useProperties(options: Options = {}) {
  const { partnerOrgId, includeInactive = false, enabled = true } = options;
  const [properties, setProperties] = useState<SVProperty[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setProperties([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = watchProperties(
      (items) => {
        setProperties(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      { partnerOrgId, includeInactive, enabled },
    );

    return () => {
      unsubscribe();
    };
  }, [enabled, includeInactive, partnerOrgId]);

  const visibleProperties = useMemo(() => {
    if (includeInactive) {
      return properties;
    }
    return properties.filter((property) => property.isActive !== false);
  }, [includeInactive, properties]);

  return {
    properties: visibleProperties,
    loading,
    error,
  };
}

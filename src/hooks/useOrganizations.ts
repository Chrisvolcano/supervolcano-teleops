/**
 * ORGANIZATIONS HOOK
 * Fetches and caches organizations with filtering
 */

import { useState, useEffect } from "react";
import { organizationsService } from "@/services/organizations.service";
import type { Organization, OrganizationType } from "@/types/organization.types";

export function useOrganizations(type?: OrganizationType) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchOrganizations() {
      try {
        setLoading(true);
        setError(null);
        const orgs = await organizationsService.listOrganizations(type);
        if (mounted) {
          setOrganizations(orgs);
        }
      } catch (err: unknown) {
        if (mounted) {
          const message =
            err instanceof Error ? err.message : "Failed to fetch organizations";
          setError(message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void fetchOrganizations();

    return () => {
      mounted = false;
    };
  }, [type]);

  return { organizations, loading, error };
}


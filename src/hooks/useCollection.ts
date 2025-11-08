"use client";

import { useEffect, useMemo, useState } from "react";
import {
  QueryConstraint,
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
} from "firebase/firestore";

import { firestore } from "@/lib/firebaseClient";

type UseCollectionOptions<T> = {
  path: string;
  constraints?: QueryConstraint[];
  whereEqual?: Array<{ field: string; value: unknown }>;
  orderByField?: { field: string; direction?: "asc" | "desc" };
  parse?: (doc: DocumentData) => T;
  enabled?: boolean;
};

export function useCollection<T = DocumentData>({
  path,
  constraints = [],
  whereEqual,
  orderByField,
  parse,
  enabled = true,
}: UseCollectionOptions<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const builtQuery = useMemo(() => {
    const colRef = collection(firestore, path);
    const filters: QueryConstraint[] = [...constraints];

    if (whereEqual?.length) {
      filters.push(
        ...whereEqual.map(({ field, value }) => where(field, "==", value)),
      );
    }

    if (orderByField) {
      filters.push(orderBy(orderByField.field, orderByField.direction));
    }

    if (!filters.length) {
      return query(colRef);
    }

    return query(colRef, ...filters);
  }, [path, constraints, whereEqual, orderByField]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      builtQuery,
      (snapshot) => {
        const next = snapshot.docs.map((doc) => {
          const payload: DocumentData = { id: doc.id, ...doc.data() };
          return parse ? parse(payload) : (payload as T);
        });
        setData(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [builtQuery, enabled, parse]);

  return { data, loading, error };
}


"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, type DocumentData } from "firebase/firestore";

import { firestore } from "@/lib/firebaseClient";

type UseDocOptions<T> = {
  path: string;
  docId: string;
  parse?: (doc: DocumentData) => T;
  enabled?: boolean;
};

export function useDoc<T = DocumentData>({
  path,
  docId,
  parse,
  enabled = true,
}: UseDocOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!docId || !enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const docRef = doc(firestore, path, docId);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setData(null);
          setLoading(false);
          setError("Document not found");
          return;
        }
        const payload: DocumentData = { id: snapshot.id, ...snapshot.data() };
        setData(parse ? parse(payload) : (payload as T));
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [path, docId, parse, enabled]);

  return { data, loading, error };
}


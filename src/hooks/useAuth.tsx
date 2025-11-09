"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  User,
  getIdTokenResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { useRouter } from "next/navigation";

import { firebaseAuth } from "@/lib/firebaseClient";

type AuthContextValue = {
  user: User | null;
  claims: Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  refreshClaims: (force?: boolean) => Promise<Record<string, unknown> | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claims, setClaims] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      (authUser) => {
        async function handleAuth() {
          setUser(authUser);
          setLoading(false);
          setError(null);
          if (authUser) {
            const token = await getIdTokenResult(authUser, true).catch(() => null);
            setClaims(token?.claims ?? null);
          } else {
            setClaims(null);
          }
        }
        void handleAuth();
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [router]);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        await signInWithEmailAndPassword(firebaseAuth, email, password);
        router.replace("/properties");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unexpected authentication error.";
        setError(message);
        setLoading(false);
        throw err;
      }
    },
    [router],
  );

  const logout = useCallback(async () => {
    await signOut(firebaseAuth);
    setUser(null);
    setClaims(null);
    router.replace("/login");
  }, [router]);

  const getIdToken = useCallback(async () => {
    const current = firebaseAuth.currentUser;
    if (!current) return null;
    return current.getIdToken(true);
  }, []);

  const value = useMemo(
    () => ({
      user,
      claims,
      loading,
      error,
      login,
      logout,
      getIdToken,
      refreshClaims: async (force = true) => {
        const current = firebaseAuth.currentUser;
        if (!current) return null;
        try {
          const token = await getIdTokenResult(current, force);
          setClaims(token.claims ?? null);
          return token.claims ?? null;
        } catch (error) {
          console.error("Failed to refresh claims", error);
          return null;
        }
      },
    }),
    [user, claims, loading, error, login, logout, getIdToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}


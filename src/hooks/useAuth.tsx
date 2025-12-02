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

import { firebaseAuth, firebaseApp } from "@/lib/firebaseClient";

if (typeof window !== "undefined") {
  const globalObject = window as typeof window & {
    firebaseApp?: typeof firebaseApp;
    firebaseAuth?: typeof firebaseAuth;
    debugClaims?: () => Promise<Record<string, unknown> | null>;
  };

  globalObject.firebaseApp = firebaseApp;
  globalObject.firebaseAuth = firebaseAuth;
  globalObject.debugClaims = async () => {
    const current = firebaseAuth.currentUser;
    if (!current) {
      console.warn("[debugClaims] No current user");
      return null;
    }
    const token = await current.getIdTokenResult();
    console.log("[debugClaims]", token.claims);
    return token.claims;
  };
}

type AuthContextValue = {
  user: User | null;
  claims: Record<string, unknown> | null;
  loading: boolean;
  initializing: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: (force?: boolean) => Promise<string | null>;
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
  const [initializing, setInitializing] = useState(true);
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
            const token = await getIdTokenResult(authUser).catch(() => null);
            setClaims(token?.claims ?? null);
          } else {
            setClaims(null);
          }
          setInitializing(false);
        }
        void handleAuth();
      },
      (err) => {
        setError(err.message);
        setLoading(false);
        setInitializing(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      console.info("[auth] attempting login", email);
      try {
        const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
        console.info("[auth] login succeeded", email);
        
        // Get token to check user role (force refresh to get latest claims)
        const tokenResult = await userCredential.user.getIdTokenResult(true);
        const role = tokenResult.claims.role as string | undefined;
        
        // Update claims state
        setClaims(tokenResult.claims);
        
        // Redirect based on role
        if (role === "superadmin" || role === "partner_admin" || role === "admin") {
          router.replace("/admin");
        } else if (role === "org_manager" || role === "oem_teleoperator") {
          router.replace("/org/dashboard");
        } else {
          // Fallback to properties for other roles or no role
          router.replace("/properties");
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unexpected authentication error.";
        console.error("[auth] login failed", email, err);
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

  const getIdToken = useCallback(async (force?: boolean) => {
    const current = firebaseAuth.currentUser;
    if (!current) return null;
    return current.getIdToken(force ?? false);
  }, []);

  const value = useMemo(
    () => ({
      user,
      claims,
      loading,
      initializing,
      error,
      login,
      logout,
      getIdToken,
      refreshClaims: async (force = false) => {
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
    [user, claims, loading, initializing, error, login, logout, getIdToken],
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


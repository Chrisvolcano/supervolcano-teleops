/**
 * AUTHENTICATION CONTEXT
 * Manages user auth state with Firebase
 * Uses AuthService for role validation and organization checking
 * Last updated: 2025-01-26
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '@/config/firebase';
import { AuthService } from '@/services/auth.service';
import type { UserProfile } from '@/types/user.types';

interface AuthContextType {
  user: UserProfile | null;
  userProfile: UserProfile | null; // Alias for user (for consistency with web app)
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[Auth] Setting up auth listener');
    
    // Try to load cached profile first (faster UX)
    AuthService.getCachedProfile().then((cached) => {
      if (cached) {
        setUser(cached);
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[Auth] Auth state changed:', firebaseUser?.email || 'null');
      
      if (firebaseUser) {
        try {
          // Refresh profile from Firestore
          const profile = await AuthService.refreshProfile(firebaseUser.uid);
          setUser(profile);
        } catch (error: any) {
          console.error('[Auth] Error refreshing profile:', error);
          // If refresh fails, try cached profile
          const cached = await AuthService.getCachedProfile();
          if (cached) {
            setUser(cached);
          } else {
            setUser(null);
          }
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('[Auth] Signing in:', email);
      setLoading(true);
      
      const userProfile = await AuthService.signIn(email, password);
      console.log('[Auth] Sign in successful');
      
      setUser(userProfile);
    } catch (error: any) {
      console.error('[Auth] Sign in error:', error);
      throw error; // Re-throw to let UI handle error messages
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('[Auth] Signing out');
      await AuthService.signOut();
      setUser(null);
      console.log('[Auth] Sign out successful');
    } catch (error: any) {
      console.error('[Auth] Sign out error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile: user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

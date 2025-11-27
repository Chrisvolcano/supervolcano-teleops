/**
 * AUTHENTICATION CONTEXT
 * Manages user auth state with Firebase
 * Persists auth across app restarts
 * Last updated: 2025-11-26
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[Auth] Setting up auth listener');
    
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[Auth] Auth state changed:', firebaseUser?.email || 'null');
      
      if (firebaseUser) {
        await loadUserData(firebaseUser);
      } else {
        setUser(null);
        await AsyncStorage.removeItem('user');
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadUserData = async (firebaseUser: FirebaseUser) => {
    try {
      console.log('[Auth] Loading user data for:', firebaseUser.uid);
      
      // Fetch user document from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (!userDoc.exists()) {
        console.error('[Auth] User document not found in Firestore');
        throw new Error('User profile not found');
      }

      const userData = userDoc.data();
      
      const user: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: userData.displayName || userData.name || 'User',
        role: userData.role || 'field_operator',
      };

      console.log('[Auth] User loaded:', user.email, user.role);
      
      setUser(user);
      
      // Persist to AsyncStorage for faster loads
      await AsyncStorage.setItem('user', JSON.stringify(user));
    } catch (error: any) {
      console.error('[Auth] Error loading user data:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('[Auth] Signing in:', email);
      setLoading(true);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('[Auth] Sign in successful');
      
      await loadUserData(userCredential.user);
    } catch (error: any) {
      console.error('[Auth] Sign in error:', error);
      
      // Provide user-friendly error messages
      let message = 'Login failed';
      
      if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Incorrect password';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many failed attempts. Please try again later.';
      }
      
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('[Auth] Signing out');
      await firebaseSignOut(auth);
      setUser(null);
      await AsyncStorage.removeItem('user');
      console.log('[Auth] Sign out successful');
    } catch (error: any) {
      console.error('[Auth] Sign out error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
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


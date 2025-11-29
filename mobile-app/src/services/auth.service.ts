/**
 * AUTHENTICATION SERVICE - Mobile App
 * Handles Firebase Auth + Firestore user profile fetching
 * Validates role and organization assignment
 */

import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile } from '@/types/user.types';

const USER_PROFILE_KEY = '@user_profile';

export class AuthService {
  /**
   * Sign in with email and password
   * Validates role is field worker (location_cleaner or oem_teleoperator)
   */
  static async signIn(email: string, password: string): Promise<UserProfile> {
    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Fetch user profile from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (!userDoc.exists()) {
        throw new Error('User profile not found. Please contact support.');
      }

      const userData = userDoc.data();
      
      // Validate role - must be a field worker role
      const allowedRoles = ['location_cleaner', 'oem_teleoperator'];
      if (!allowedRoles.includes(userData.role)) {
        await firebaseSignOut(auth);
        throw new Error('Only field workers can access the mobile app. Please use the web portal.');
      }

      // Validate has organization
      if (!userData.organizationId) {
        await firebaseSignOut(auth);
        throw new Error('Your account is not assigned to an organization. Please contact your manager.');
      }

      const userProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName: userData.displayName || firebaseUser.displayName || firebaseUser.email!,
        role: userData.role,
        organizationId: userData.organizationId,
        created_at: userData.created_at?.toDate() || new Date(),
        updated_at: userData.updated_at?.toDate() || new Date(),
      };

      // Store profile locally for offline access
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));

      return userProfile;
    } catch (error: any) {
      // Handle specific Firebase Auth errors
      if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email.');
      }
      if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password.');
      }
      if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email format.');
      }
      if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later.');
      }
      
      throw error;
    }
  }

  /**
   * Sign out and clear local data
   */
  static async signOut(): Promise<void> {
    await firebaseSignOut(auth);
    await AsyncStorage.removeItem(USER_PROFILE_KEY);
  }

  /**
   * Get cached user profile (for offline access)
   */
  static async getCachedProfile(): Promise<UserProfile | null> {
    try {
      const cached = await AsyncStorage.getItem(USER_PROFILE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  /**
   * Listen for auth state changes
   */
  static onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Refresh user profile from Firestore
   */
  static async refreshProfile(uid: string): Promise<UserProfile> {
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    if (!userDoc.exists()) {
      throw new Error('User profile not found');
    }

    const userData = userDoc.data();
    const user = auth.currentUser;

    const userProfile: UserProfile = {
      uid,
      email: user?.email || userData.email,
      displayName: userData.displayName || user?.displayName || user?.email!,
      role: userData.role,
      organizationId: userData.organizationId,
      created_at: userData.created_at?.toDate() || new Date(),
      updated_at: userData.updated_at?.toDate() || new Date(),
    };

    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
    return userProfile;
  }
}


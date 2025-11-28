import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFirestore, enableNetwork } from 'firebase/firestore';
import Constants from 'expo-constants';

console.log('🔥 Initializing Firebase...');

// Get config from app.json extra field (production) or .env (development)
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId || process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: Constants.expoConfig?.extra?.firebaseAppId || process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

console.log('🔥 Project ID:', firebaseConfig.projectId);
console.log('🔥 Storage Bucket:', firebaseConfig.storageBucket);

// Validate config
const missingKeys = Object.entries(firebaseConfig)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  console.error('❌ Missing Firebase config keys:', missingKeys);
  throw new Error('Firebase config incomplete. Missing: ' + missingKeys.join(', '));
}

console.log('✅ Firebase config loaded');

// Validate all config values are present
const configValid = Object.values(firebaseConfig).every(value => value && value !== '');
if (!configValid) {
  console.error('❌ Firebase config validation failed!');
  console.error('Config values:', {
    hasApiKey: !!firebaseConfig.apiKey,
    hasAuthDomain: !!firebaseConfig.authDomain,
    hasProjectId: !!firebaseConfig.projectId,
    hasStorageBucket: !!firebaseConfig.storageBucket,
    hasMessagingSenderId: !!firebaseConfig.messagingSenderId,
    hasAppId: !!firebaseConfig.appId,
  });
  throw new Error('Firebase config is incomplete');
}

const app = initializeApp(firebaseConfig);
console.log('✅ Firebase app initialized');
console.log('App name:', app.name);

// Initialize Auth (Firebase Auth automatically persists on React Native)
export const auth = getAuth(app);
console.log('✅ Firebase Auth initialized');

// Initialize Storage
export const storage = getStorage(app);
console.log('✅ Firebase Storage initialized');
console.log('Storage bucket:', firebaseConfig.storageBucket);

// Initialize Firestore with correct database ID (no parentheses!)
// Use 'default' not '(default)'
const databaseId = Constants.expoConfig?.extra?.firebaseDatabaseId || process.env.EXPO_PUBLIC_FIREBASE_DATABASE_ID || 'default';
export const firestore = getFirestore(app, databaseId);
export const db = firestore; // Alias for convenience
console.log('✅ Firestore initialized');
console.log('Database ID:', databaseId);

// Enable network explicitly
enableNetwork(firestore)
  .then(() => {
    console.log('✅ Firestore network enabled');
  })
  .catch((error) => {
    console.error('❌ Failed to enable network:', error);
  });

console.log(`✅ Firebase fully initialized with database ID: ${databaseId}`);
console.log('═══════════════════════════════════════');


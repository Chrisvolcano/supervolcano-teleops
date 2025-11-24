import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore, enableNetwork } from 'firebase/firestore';

console.log('🔥 Initializing Firebase...');
console.log('🔥 Project ID:', process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID);
console.log('🔥 Storage Bucket:', process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET);

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

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

// Initialize Storage
export const storage = getStorage(app);
console.log('✅ Firebase Storage initialized');
console.log('Storage bucket:', firebaseConfig.storageBucket);

// Initialize Firestore with correct database ID (no parentheses!)
// Use 'default' not '(default)'
const databaseId = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_ID || 'default';
export const firestore = getFirestore(app, databaseId);
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


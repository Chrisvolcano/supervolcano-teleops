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

const app = initializeApp(firebaseConfig);

// Initialize Storage
export const storage = getStorage(app);

// Initialize Firestore with correct database ID (no parentheses!)
// Use 'default' not '(default)'
const databaseId = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_ID || 'default';
export const firestore = getFirestore(app, databaseId);

// Enable network explicitly
enableNetwork(firestore)
  .then(() => {
    console.log('✅ Firestore network enabled');
  })
  .catch((error) => {
    console.error('❌ Failed to enable network:', error);
  });

console.log(`✅ Firebase initialized with database ID: ${databaseId}`);


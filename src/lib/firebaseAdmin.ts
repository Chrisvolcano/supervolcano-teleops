/**
 * Firebase Admin SDK Configuration
 * 
 * Required Environment Variables (must be in .env.local):
 * - FIREBASE_ADMIN_PROJECT_ID: Firebase project ID (e.g., "super-volcano-oem-portal")
 * - FIREBASE_ADMIN_CLIENT_EMAIL: Service account email from Firebase Console
 * - FIREBASE_ADMIN_PRIVATE_KEY: Service account private key (with \n characters preserved)
 * - FIRESTORE_DATABASE_ID: Optional, defaults to "default" for nam5 multi-region
 * 
 * Database: Uses 'default' (without parentheses) for nam5 multi-region
 * 
 * How to get credentials:
 * 1. Go to Firebase Console → Project Settings → Service Accounts
 * 2. Click "Generate new private key"
 * 3. Download JSON file
 * 4. Extract: project_id → FIREBASE_ADMIN_PROJECT_ID
 *            client_email → FIREBASE_ADMIN_CLIENT_EMAIL
 *            private_key → FIREBASE_ADMIN_PRIVATE_KEY (keep \n characters!)
 */

import { App, cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

declare global {
  // eslint-disable-next-line no-var
  var firebaseAdminApp: App | undefined;
  // eslint-disable-next-line no-var
  var firebaseAdminDb: ReturnType<typeof getFirestore> | undefined;
}

/**
 * Get or initialize Firebase Admin App (singleton pattern)
 */
export function getAdminApp(): App {
  if (typeof window !== "undefined") {
    throw new Error("Firebase Admin SDK must only be used on the server.");
  }

  if (global.firebaseAdminApp) {
    return global.firebaseAdminApp;
  }

  // Verify environment variables exist
  const requiredEnvVars = [
    "FIREBASE_ADMIN_PROJECT_ID",
    "FIREBASE_ADMIN_CLIENT_EMAIL",
    "FIREBASE_ADMIN_PRIVATE_KEY",
  ];

  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID!;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL!;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replaceAll(
    "\\n",
    "\n",
  );

  console.log("[Firebase Admin] Initializing with project:", projectId);

  // Initialize app
  const app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    storageBucket: `${projectId}.firebasestorage.app`,
  });

  global.firebaseAdminApp = app;
  console.log("[Firebase Admin] Initialized successfully");

  return app;
}

/**
 * Get or initialize Firestore instance (singleton pattern)
 */
export function getAdminDb() {
  if (global.firebaseAdminDb) {
    return global.firebaseAdminDb;
  }

  const app = getAdminApp();
  const databaseId = process.env.FIRESTORE_DATABASE_ID?.trim() || "default";
  
  const db = getFirestore(app, databaseId);

  // Settings for Firestore
  db.settings({
    ignoreUndefinedProperties: true,
  });

  global.firebaseAdminDb = db;
  console.log("[Firebase Admin] Firestore initialized with database:", databaseId);

  return db;
}

// Export commonly used instances
export const firebaseAdminApp = getAdminApp();
export const adminApp = firebaseAdminApp;
export const adminDb = getAdminDb();
export const adminAuth = getAuth(firebaseAdminApp);
export const adminStorage = getStorage(firebaseAdminApp);


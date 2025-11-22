/**
 * Firebase Admin SDK Configuration
 * 
 * Required Environment Variables:
 * - FIREBASE_ADMIN_PROJECT_ID
 * - FIREBASE_ADMIN_CLIENT_EMAIL
 * - FIREBASE_ADMIN_PRIVATE_KEY (with \n characters preserved)
 * - FIREBASE_ADMIN_DATABASE_ID (optional, defaults to "default")
 * 
 * Database: Uses 'default' (without parentheses) for nam5 multi-region
 */

import { App, cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

declare global {
  // eslint-disable-next-line no-var
  var firebaseAdminApp: App | undefined;
}

function getFirebaseAdminApp(): App {
  if (typeof window !== "undefined") {
    throw new Error("Firebase Admin SDK must only be used on the server.");
  }

  if (global.firebaseAdminApp) {
    return global.firebaseAdminApp;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replaceAll(
    "\\n",
    "\n",
  );

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin config. Check FIREBASE_ADMIN_* environment variables.",
    );
  }

  const app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  global.firebaseAdminApp = app;
  return app;
}

export const firebaseAdminApp = getFirebaseAdminApp();
export const adminAuth = getAuth(firebaseAdminApp);

const FIRESTORE_DATABASE_ID = process.env.FIREBASE_ADMIN_DATABASE_ID?.trim() || "default";

export const adminDb = getFirestore(firebaseAdminApp, FIRESTORE_DATABASE_ID);


import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, setLogLevel } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const fallbackConfig = {
  apiKey: "AIzaSyBJd8_A8tH6e2S5WhgwHqoeXIB58WQWDvw",
  authDomain: "super-volcano-oem-portal.firebaseapp.com",
  projectId: "super-volcano-oem-portal",
  storageBucket: "super-volcano-oem-portal.firebasestorage.app",
  messagingSenderId: "243745387315",
  appId: "1:243745387315:web:88448a0ee710a8fcc2c446",
} as const;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? fallbackConfig.apiKey,
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? fallbackConfig.authDomain,
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? fallbackConfig.projectId,
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    fallbackConfig.storageBucket,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??
    fallbackConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? fallbackConfig.appId,
};

function getFirebaseApp(): FirebaseApp {
  if (Object.values(firebaseConfig).some((value) => !value)) {
    throw new Error(
      "Missing Firebase client config. Ensure NEXT_PUBLIC_FIREBASE_* env vars are set.",
    );
  }

  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export const firebaseApp = getFirebaseApp();

if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_FIRESTORE_DEBUG === "true") {
  try {
    setLogLevel("debug");
  } catch (error) {
    console.warn("Failed to set Firestore log level", error);
  }
}

export const firebaseAuth = getAuth(firebaseApp);
export const auth = firebaseAuth;
export const firestore = getFirestore(firebaseApp);
export const db = firestore;
export const storage = getStorage(firebaseApp);


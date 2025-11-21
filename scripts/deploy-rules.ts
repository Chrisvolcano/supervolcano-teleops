/**
 * Script to deploy Firestore and Storage rules to Firebase
 * 
 * This uses the Firebase Admin SDK to deploy rules programmatically.
 * Alternative: Use Firebase Console or Firebase CLI
 * 
 * Usage: npx tsx scripts/deploy-rules.ts
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try multiple possible paths for service account
const possiblePaths = [
  join(__dirname, "..", "..", "super-volcano-oem-portal-firebase-adminsdk-fbsvc-9afc946529.json"),
  join(process.cwd(), "..", "super-volcano-oem-portal-firebase-adminsdk-fbsvc-9afc946529.json"),
  process.env.GOOGLE_APPLICATION_CREDENTIALS,
].filter(Boolean) as string[];

let serviceAccount: any;

for (const serviceAccountPath of possiblePaths) {
  try {
    if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
      const serviceAccountData = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
      serviceAccount = serviceAccountData;
      console.log(`✅ Found service account at: ${serviceAccountPath}`);
      break;
    }
  } catch {
    // Try next path
  }
}

if (!serviceAccount) {
  console.error("❌ Service account file not found.");
  process.exit(1);
}

const projectId = serviceAccount.projectId || serviceAccount.project_id;

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId,
  });
}

async function deployRules() {
  console.log(`\n📋 Deploying Firestore rules for project: ${projectId}\n`);
  
  // Read Firestore rules
  const firestoreRulesPath = join(__dirname, "..", "src", "firebase", "firestore.rules");
  const storageRulesPath = join(__dirname, "..", "src", "firebase", "storage.rules");
  
  if (!fs.existsSync(firestoreRulesPath)) {
    console.error(`❌ Firestore rules file not found: ${firestoreRulesPath}`);
    process.exit(1);
  }
  
  const firestoreRules = fs.readFileSync(firestoreRulesPath, "utf8");
  const storageRules = fs.existsSync(storageRulesPath) 
    ? fs.readFileSync(storageRulesPath, "utf8")
    : null;
  
  console.log("📄 Firestore rules file found");
  if (storageRules) {
    console.log("📄 Storage rules file found");
  }
  
  console.log("\n⚠️  IMPORTANT: This script cannot deploy rules directly.");
  console.log("   Rules must be deployed via:");
  console.log("   1. Firebase Console (easiest)");
  console.log("   2. Firebase CLI: firebase deploy --only firestore:rules");
  console.log("\n📋 To deploy via Firebase Console:");
  console.log("   1. Go to https://console.firebase.google.com/");
  console.log(`   2. Select project: ${projectId}`);
  console.log("   3. Go to Firestore Database → Rules");
  console.log("   4. Copy and paste the contents of:");
  console.log(`      ${firestoreRulesPath}`);
  console.log("   5. Click 'Publish'");
  console.log("\n📋 To deploy via Firebase CLI:");
  console.log("   1. Install: npm install -g firebase-tools");
  console.log("   2. Login: firebase login");
  console.log(`   3. Deploy: firebase deploy --only firestore:rules --project ${projectId}`);
  console.log(`   4. Storage: firebase deploy --only storage:rules --project ${projectId}`);
  
  console.log("\n📄 Firestore Rules Preview (first 20 lines):");
  console.log("─".repeat(60));
  console.log(firestoreRules.split("\n").slice(0, 20).join("\n"));
  console.log("─".repeat(60));
  console.log(`\n✅ Rules file is ready at: ${firestoreRulesPath}`);
  console.log(`   Project ID: ${projectId}`);
}

deployRules()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Failed:", error);
    process.exit(1);
  });


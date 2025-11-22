/**
 * Script to check if locations are being saved in Firestore
 * 
 * Usage: npx tsx scripts/check-locations.ts
 * 
 * This script reads from the locations collection and displays what's there.
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
  console.error("❌ Service account file not found. Tried:");
  possiblePaths.forEach((p) => console.error(`   - ${p}`));
  process.exit(1);
}

if (getApps().length === 0) {
  const projectId = serviceAccount.projectId || serviceAccount.project_id;
  console.log(`🔧 Initializing Firebase Admin with project: ${projectId}`);
  initializeApp({
    credential: cert(serviceAccount),
    projectId,
  });
}

const db = getFirestore();
console.log(`📦 Firestore database initialized`);

async function checkLocations() {
  try {
    console.log("\n🔍 Checking locations collection...\n");
    
    // Try to list all collections first to verify connection
    try {
      const collections = await db.listCollections();
      console.log(`📚 Available collections: ${collections.map(c => c.id).join(", ")}\n`);
    } catch (listError) {
      console.warn("⚠️  Could not list collections (this is okay):", listError instanceof Error ? listError.message : String(listError));
    }
    
    const locationsRef = db.collection("locations");
    const snapshot = await locationsRef.limit(100).get();
    
    console.log(`📊 Found ${snapshot.size} documents in 'locations' collection\n`);
    
    if (snapshot.empty) {
      console.log("⚠️  No locations found! This means:");
      console.log("   1. Locations haven't been saved yet, OR");
      console.log("   2. They're being saved to a different collection, OR");
      console.log("   3. There's a permission issue preventing reads\n");
      
      // Check if properties collection exists
      const propertiesRef = db.collection("properties");
      const propertiesSnapshot = await propertiesRef.get();
      if (propertiesSnapshot.size > 0) {
        console.log(`⚠️  Found ${propertiesSnapshot.size} documents in 'properties' collection instead!`);
        console.log("   This suggests the old collection name is still being used.\n");
      }
    } else {
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`📍 Document ID: ${doc.id}`);
        console.log(`   Name: ${data.name || "(no name)"}`);
        console.log(`   Partner Org: ${data.partnerOrgId || data.partner_org_id || "(none)"}`);
        console.log(`   Created By: ${data.createdBy || data.created_by || "(none)"}`);
        console.log(`   Created At: ${data.createdAt?.toDate?.() || data.created_at?.toDate?.() || data.createdAt || "(none)"}`);
        console.log(`   Is Active: ${data.isActive !== false ? "true" : "false"}`);
        console.log(`   Status: ${data.status || "(none)"}`);
        console.log(`   Address: ${data.address || "(none)"}`);
        console.log(`   Images: ${Array.isArray(data.images) ? data.images.length : 0}`);
        console.log(`   Media: ${Array.isArray(data.media) ? data.media.length : 0}`);
        console.log("");
      });
    }
    
    // Also check properties collection for comparison
    const propertiesRef = db.collection("properties");
    const propertiesSnapshot = await propertiesRef.get();
    if (propertiesSnapshot.size > 0) {
      console.log(`\n📋 Found ${propertiesSnapshot.size} documents in 'properties' collection (old collection name)`);
      console.log("   These won't show up in the app since it reads from 'locations'\n");
    }
    
  } catch (error) {
    console.error("❌ Error checking locations:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
    }
    process.exit(1);
  }
}

checkLocations()
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Failed:", error);
    process.exit(1);
  });


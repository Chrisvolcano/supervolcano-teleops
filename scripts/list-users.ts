/**
 * Script to list all users in Firebase Auth
 * 
 * Usage: npx tsx scripts/list-users.ts
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
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
  initializeApp({
    credential: cert(serviceAccount),
    projectId,
  });
}

const auth = getAuth();

async function listUsers() {
  try {
    console.log("\n📋 Listing all users...\n");
    
    let nextPageToken: string | undefined;
    let userCount = 0;
    
    do {
      const listUsersResult = await auth.listUsers(1000, nextPageToken);
      
      for (const userRecord of listUsersResult.users) {
        userCount++;
        const claims = userRecord.customClaims || {};
        console.log(`${userCount}. ${userRecord.email || "(no email)"}`);
        console.log(`   UID: ${userRecord.uid}`);
        console.log(`   Role: ${claims.role || "(not set)"}`);
        console.log(`   Partner Org: ${claims.partner_org_id || "(not set)"}`);
        console.log(`   Created: ${userRecord.metadata.creationTime}`);
        console.log("");
      }
      
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);
    
    console.log(`\n✅ Total users: ${userCount}`);
    console.log("\n💡 To set admin role for a user, run:");
    console.log("   npm run set-admin <email-address>");
    
  } catch (error) {
    console.error("❌ Error listing users:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
    }
    process.exit(1);
  }
}

listUsers()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Failed:", error);
    process.exit(1);
  });


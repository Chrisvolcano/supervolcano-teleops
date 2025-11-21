/**
 * Script to set admin role for a user
 * 
 * Usage: npx tsx scripts/set-admin-role.ts <email>
 * 
 * This sets the Firebase custom claims to make a user an admin.
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
  console.error("\nPlease:");
  console.error("   1. Place the service account JSON in one of the paths above, OR");
  console.error("   2. Set GOOGLE_APPLICATION_CREDENTIALS environment variable");
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

async function setAdminRole(email: string) {
  try {
    console.log(`\n🔍 Looking up user: ${email}...`);
    let user;
    
    try {
      user = await auth.getUserByEmail(email);
      console.log(`✅ Found existing user: ${user.email} (${user.uid})`);
    } catch (error: any) {
      if (error?.code === 'auth/user-not-found') {
        console.log(`ℹ️  User not found. Creating new user...`);
        // Create the user with temporary password
        const tempPassword = "ChangeMe123!";
        user = await auth.createUser({
          email,
          emailVerified: false,
          password: tempPassword,
        });
        console.log(`✅ Created new user: ${user.email} (${user.uid})`);
        console.log(`🔑 Temporary password set: ${tempPassword}`);
        console.log(`⚠️  User should change this password after first login.`);
      } else {
        throw error;
      }
    }
    
    console.log(`📋 Current custom claims:`, user.customClaims || "(none)");
    
    // Update password if needed
    const tempPassword = "ChangeMe123!";
    try {
      await auth.updateUser(user.uid, {
        password: tempPassword,
      });
      console.log(`🔑 Password updated: ${tempPassword}`);
      console.log(`⚠️  User should change this password after first login.`);
    } catch (passwordError) {
      console.warn(`⚠️  Could not update password:`, passwordError instanceof Error ? passwordError.message : String(passwordError));
    }
    
    console.log(`\n🔧 Setting admin role...`);
    await auth.setCustomUserClaims(user.uid, {
      role: "admin",
      partner_org_id: user.customClaims?.partner_org_id ?? null,
    });
    
    console.log(`✅ Admin role set successfully!`);
    console.log(`\n⚠️  IMPORTANT: The user must sign out and sign back in for the new role to take effect.`);
    console.log(`   Or they can call refreshClaims() in the app.`);
    
    // Verify
    const updatedUser = await auth.getUser(user.uid);
    console.log(`\n📋 Updated custom claims:`, updatedUser.customClaims);
    
  } catch (error) {
    console.error("❌ Error setting admin role:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
    }
    process.exit(1);
  }
}

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.error("❌ Please provide an email address");
  console.error("\nUsage: npx tsx scripts/set-admin-role.ts <email>");
  console.error("\nExample: npx tsx scripts/set-admin-role.ts admin@example.com");
  process.exit(1);
}

setAdminRole(email)
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Failed:", error);
    process.exit(1);
  });


/**
 * Script to reset a teleoperator's password
 * Usage: npx tsx scripts/reset-teleoperator-password.ts <email> <newPassword>
 */

// CRITICAL: Load environment variables FIRST, before any other imports
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local file
const envPath = resolve(process.cwd(), ".env.local");
console.log("📁 Loading environment variables from:", envPath);
const result = config({ path: envPath });

if (result.error) {
  console.error("❌ Failed to load .env.local:", result.error.message);
  console.error("💡 Make sure .env.local exists in the project root.");
  process.exit(1);
}

// Verify required env vars are loaded
const requiredVars = [
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
];

const missingVars = requiredVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error("❌ Missing required environment variables:", missingVars.join(", "));
  console.error("💡 Make sure .env.local contains all required Firebase Admin variables.");
  process.exit(1);
}

console.log("✅ Environment variables loaded successfully\n");

async function resetPassword() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error("Usage: npx tsx scripts/reset-teleoperator-password.ts <email> <newPassword>");
    console.error("\nExample:");
    console.error('  npx tsx scripts/reset-teleoperator-password.ts teleoperator@demo.com "NewPassword123!"');
    process.exit(1);
  }

  // Dynamically import Firebase Admin AFTER env vars are loaded
  const { adminAuth, adminDb } = await import("../src/lib/firebaseAdmin");

  try {
    console.log(`🔍 Looking up user: ${email}...\n`);

    // Get user by email
    let user;
    try {
      user = await adminAuth.getUserByEmail(email);
      console.log(`✅ Found user: ${user.uid}`);
      console.log(`   Display Name: ${user.displayName || "Not set"}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Disabled: ${user.disabled ? "Yes ❌" : "No ✅"}`);
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        console.error(`❌ User with email "${email}" not found.`);
        console.error("💡 Make sure the email is correct or create the user first.");
        process.exit(1);
      }
      throw error;
    }

    // Check if user is enabled
    if (user.disabled) {
      console.log("\n⚠️  User is disabled. Enabling user...");
      await adminAuth.updateUser(user.uid, {
        disabled: false,
      });
      console.log("✅ User enabled");
    }

    // Reset password
    console.log("\n🔐 Resetting password...");
    await adminAuth.updateUser(user.uid, {
      password: newPassword,
    });
    console.log("✅ Password reset successfully");

    // Get custom claims
    const customClaims = user.customClaims || {};
    console.log("\n📋 User Details:");
    console.log(`   UID: ${user.uid}`);
    console.log(`   Role: ${customClaims.role || "Not set"}`);
    console.log(`   Organization ID: ${customClaims.organizationId || "Not set"}`);
    console.log(`   Teleoperator ID: ${customClaims.teleoperatorId || "Not set"}`);

    console.log("\n" + "=".repeat(60));
    console.log("✅ Password reset complete!");
    console.log("=".repeat(60));
    console.log("\n📝 Updated Credentials:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}`);
    console.log("\n🔗 Login URL:");
    console.log("   http://localhost:3000/login");
    console.log("\n⚠️  User can now sign in with the new password.");
    console.log("=".repeat(60) + "\n");
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    process.exit(1);
  }
}

resetPassword()
  .then(() => {
    console.log("✨ Script complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });


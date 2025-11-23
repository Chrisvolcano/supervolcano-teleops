/**
 * Create Test Teleoperator Script
 * Creates a test teleoperator user for local development
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
  console.error("❌ Missing required environment variables:");
  missingVars.forEach((varName) => console.error(`   - ${varName}`));
  console.error("\n💡 Make sure .env.local exists and contains all FIREBASE_ADMIN_* variables.");
  process.exit(1);
}

console.log("✅ Environment variables loaded successfully\n");

const TEST_PARTNER_ID = "demo-org";
const TEST_TELEOPERATOR_EMAIL = "teleoperator@demo.com";
const TEST_TELEOPERATOR_PASSWORD = "TestTeleop123!";
const TEST_TELEOPERATOR_NAME = "Test Teleoperator";

async function createTestTeleoperator() {
  console.log("🚀 Creating test teleoperator user...\n");

  // Dynamically import Firebase Admin AFTER env vars are loaded
  const { adminAuth, adminDb } = await import("../src/lib/firebaseAdmin");
  const { FieldValue } = await import("firebase-admin/firestore");
  const { createTeleoperator } = await import("../src/lib/repositories/teleoperators");

  try {
    // 1. Check if teleoperator already exists
    console.log("📋 Step 1: Checking for existing teleoperator...");
    let existingTeleoperator = null;
    try {
      const user = await adminAuth.getUserByEmail(TEST_TELEOPERATOR_EMAIL);
      console.log(`   ℹ️  User "${TEST_TELEOPERATOR_EMAIL}" already exists (UID: ${user.uid})`);
      
      // Check if teleoperator document exists
      const teleoperatorSnapshot = await adminDb
        .collection("teleoperators")
        .where("uid", "==", user.uid)
        .limit(1)
        .get();

      if (!teleoperatorSnapshot.empty) {
        existingTeleoperator = teleoperatorSnapshot.docs[0].data();
        console.log(`   ℹ️  Teleoperator document already exists`);
      }
    } catch (error: any) {
      if (error.code !== "auth/user-not-found") {
        throw error;
      }
    }

    if (existingTeleoperator) {
      // Update password
      const user = await adminAuth.getUserByEmail(TEST_TELEOPERATOR_EMAIL);
      await adminAuth.updateUser(user.uid, {
        password: TEST_TELEOPERATOR_PASSWORD,
      });
      console.log("   ✅ Updated password");
      
      console.log("\n" + "=".repeat(60));
      console.log("✅ Test teleoperator already exists!");
      console.log("=".repeat(60));
      console.log("\n📝 Test Credentials:");
      console.log(`   Email: ${TEST_TELEOPERATOR_EMAIL}`);
      console.log(`   Password: ${TEST_TELEOPERATOR_PASSWORD}`);
      console.log(`   Role: teleoperator`);
      console.log(`   Partner ID: ${TEST_PARTNER_ID}`);
      console.log(`   Organization ID: ${existingTeleoperator.organizationId || 'N/A'}`);
      console.log(`   Teleoperator ID: ${existingTeleoperator.teleoperatorId}`);
      console.log("\n🔗 Test URLs:");
      console.log("   Login: http://localhost:3000/login");
      console.log("   Teleoperator Dashboard: http://localhost:3000/teleoperator/dashboard");
      console.log("=".repeat(60) + "\n");
      return;
    }

    // 2. Find or create test organization
    console.log("🏢 Step 2: Finding or creating test organization...");
    let testOrgId: string;
    let testOrgName: string;
    
    const orgsSnapshot = await adminDb
      .collection("organizations")
      .where("partnerId", "==", TEST_PARTNER_ID)
      .where("status", "==", "active")
      .limit(1)
      .get();
    
    if (!orgsSnapshot.empty) {
      const orgDoc = orgsSnapshot.docs[0];
      testOrgId = orgDoc.id;
      testOrgName = orgDoc.data().name || "Test Organization";
      console.log(`   ℹ️  Using existing organization: ${testOrgName} (${testOrgId})`);
    } else {
      // Create test organization
      const orgRef = adminDb.collection("organizations").doc();
      testOrgId = orgRef.id;
      testOrgName = "Test Organization";
      await orgRef.set({
        name: testOrgName,
        status: "active",
        partnerId: TEST_PARTNER_ID,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: "system",
      });
      console.log(`   ✅ Created test organization: ${testOrgName} (${testOrgId})`);
    }

    // 3. Create teleoperator
    console.log("\n👤 Step 3: Creating teleoperator...");
    const { teleoperatorId, uid } = await createTeleoperator(
      {
        email: TEST_TELEOPERATOR_EMAIL,
        displayName: TEST_TELEOPERATOR_NAME,
        partnerOrgId: TEST_PARTNER_ID,
        organizationId: testOrgId,
        organizationName: testOrgName,
        currentStatus: "available",
        certifications: [],
        robotTypesQualified: [],
      },
      "system", // createdBy
    );

    console.log(`   ✅ Created teleoperator (ID: ${teleoperatorId}, UID: ${uid})`);

    // 4. Update password
    console.log("\n🔐 Step 4: Setting password...");
    await adminAuth.updateUser(uid, {
      password: TEST_TELEOPERATOR_PASSWORD,
    });
    console.log("   ✅ Password set");

    // 4. Summary
    console.log("\n" + "=".repeat(60));
    console.log("✅ Test teleoperator created successfully!");
    console.log("=".repeat(60));
    console.log("\n📝 Test Credentials:");
    console.log(`   Email: ${TEST_TELEOPERATOR_EMAIL}`);
    console.log(`   Password: ${TEST_TELEOPERATOR_PASSWORD}`);
    console.log(`   Role: teleoperator`);
    console.log(`   Partner ID: ${TEST_PARTNER_ID}`);
    console.log(`   Teleoperator ID: ${teleoperatorId}`);
    console.log(`   User UID: ${uid}`);
    console.log("\n🔗 Test URLs:");
    console.log("   Login: http://localhost:3000/login");
    console.log("   Teleoperator Dashboard: http://localhost:3000/teleoperator/dashboard");
    console.log("\n⚠️  Note: You may need to sign out and sign back in for custom claims to take effect.");
    console.log("💡 To assign this teleoperator to a location:");
    console.log("   1. Log in as admin (admin@demo.com / TestAdmin123!)");
    console.log("   2. Go to /admin/locations");
    console.log("   3. Edit a location and assign this teleoperator");
    console.log("=".repeat(60) + "\n");

  } catch (error) {
    console.error("\n❌ Error creating test teleoperator:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
    }
    process.exit(1);
  }
}

// Run the script
createTestTeleoperator()
  .then(() => {
    console.log("✨ Script complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });


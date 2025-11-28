/**
 * Setup Test Data Script
 * Creates test fixtures for local development:
 * - Test partner organization
 * - Test admin user
 * - Firestore user document
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
const TEST_ADMIN_EMAIL = "admin@demo.com";
const TEST_ADMIN_PASSWORD = "TestAdmin123!";

async function setupTestData() {
  console.log("🚀 Setting up test data for local development...\n");

  // Dynamically import Firebase Admin AFTER env vars are loaded
  const { adminAuth, adminDb } = await import("../src/lib/firebaseAdmin");
  const { FieldValue } = await import("firebase-admin/firestore");

  try {
    // 1. Create test partner organization
    console.log("📋 Step 1: Creating test partner organization...");
    const partnerRef = adminDb.collection("partners").doc(TEST_PARTNER_ID);
    const partnerDoc = await partnerRef.get();

    if (partnerDoc.exists) {
      console.log(`   ✅ Partner "${TEST_PARTNER_ID}" already exists`);
    } else {
      await partnerRef.set({
        partnerId: TEST_PARTNER_ID,
        name: "Demo Organization",
        contactInfo: {
          email: "contact@demo-org.com",
          phone: "+1 (555) 123-4567",
        },
        businessType: "OEM Partner",
        locationIds: [],
        teleoperatorIds: [],
        subscriptionTier: "professional",
        monthlyTaskVolume: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log(`   ✅ Created partner "${TEST_PARTNER_ID}"`);
    }

    // 2. Create or update admin user in Firebase Auth
    console.log("\n👤 Step 2: Creating test admin user...");
    let adminUser;
    try {
      adminUser = await adminAuth.getUserByEmail(TEST_ADMIN_EMAIL);
      console.log(`   ℹ️  User "${TEST_ADMIN_EMAIL}" already exists (UID: ${adminUser.uid})`);
      
      // Update password
      await adminAuth.updateUser(adminUser.uid, {
        password: TEST_ADMIN_PASSWORD,
      });
      console.log("   ✅ Updated password");
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        // Create new user
        adminUser = await adminAuth.createUser({
          email: TEST_ADMIN_EMAIL,
          password: TEST_ADMIN_PASSWORD,
          displayName: "Test Admin",
          emailVerified: true,
        });
        console.log(`   ✅ Created user "${TEST_ADMIN_EMAIL}" (UID: ${adminUser.uid})`);
      } else {
        throw error;
      }
    }

    // 3. Set custom claims (superadmin role)
    console.log("\n🔐 Step 3: Setting custom claims...");
    await adminAuth.setCustomUserClaims(adminUser.uid, {
      role: "superadmin",
      partnerId: TEST_PARTNER_ID,
    });
    console.log("   ✅ Set custom claims: { role: 'superadmin', partnerId: 'demo-org' }");

    // 4. Create Firestore user document
    console.log("\n📄 Step 4: Creating Firestore user document...");
    const userRef = adminDb.collection("users").doc(adminUser.uid);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      console.log("   ✅ User document already exists");
    } else {
      await userRef.set({
        uid: adminUser.uid,
        email: TEST_ADMIN_EMAIL,
        displayName: "Test Admin",
        role: "superadmin",
        partnerOrgId: TEST_PARTNER_ID,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log("   ✅ Created user document");
    }

    // 5. Summary
    console.log("\n" + "=".repeat(60));
    console.log("✅ Test data setup complete!");
    console.log("=".repeat(60));
    console.log("\n📝 Test Credentials:");
    console.log(`   Email: ${TEST_ADMIN_EMAIL}`);
    console.log(`   Password: ${TEST_ADMIN_PASSWORD}`);
    console.log(`   Role: superadmin`);
    console.log(`   Partner ID: ${TEST_PARTNER_ID}`);
    console.log(`   User UID: ${adminUser.uid}`);
    console.log("\n🔗 Test URLs:");
    console.log("   Login: http://localhost:3000/login");
    console.log("   Admin Dashboard: http://localhost:3000/admin");
    console.log("   Teleoperators: http://localhost:3000/admin/teleoperators");
    console.log("   Test Connection: http://localhost:3000/api/test-connection");
    console.log("\n⚠️  Note: You may need to sign out and sign back in for custom claims to take effect.");
    console.log("=".repeat(60) + "\n");

  } catch (error) {
    console.error("\n❌ Error setting up test data:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
    }
    process.exit(1);
  }
}

// Run the setup
setupTestData()
  .then(() => {
    console.log("✨ Setup complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });


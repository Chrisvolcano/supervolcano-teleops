/**
 * Script to create an org_manager user for testing
 * Usage: npx tsx scripts/create-org-manager.ts <email> <password> [organizationId]
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

async function createOrgManager() {
  const email = process.argv[2];
  const password = process.argv[3];
  const organizationId = process.argv[4];

  if (!email || !password) {
    console.error("Usage: npx tsx scripts/create-org-manager.ts <email> <password> [organizationId]");
    process.exit(1);
  }

  // Dynamically import Firebase Admin AFTER env vars are loaded
  const { adminAuth, adminDb } = await import("../src/lib/firebaseAdmin");

  try {
    // Get or create organization
    let finalOrgId = organizationId;
    
    if (!finalOrgId) {
      // Find first active organization or create a test one
      const orgsSnapshot = await adminDb
        .collection("organizations")
        .where("status", "==", "active")
        .limit(1)
        .get();

      if (!orgsSnapshot.empty) {
        finalOrgId = orgsSnapshot.docs[0].id;
        console.log(`Using existing organization: ${finalOrgId}`);
      } else {
        // Create a test organization
        const testOrgRef = adminDb.collection("organizations").doc();
        await testOrgRef.set({
          name: "Test Organization",
          status: "active",
          partnerId: "demo-org", // You may need to adjust this
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: "system",
        });
        finalOrgId = testOrgRef.id;
        console.log(`Created test organization: ${finalOrgId}`);
      }
    }

    // Get organization details
    const orgDoc = await adminDb.collection("organizations").doc(finalOrgId).get();
    if (!orgDoc.exists) {
      throw new Error(`Organization ${finalOrgId} not found`);
    }
    const orgData = orgDoc.data();
    const partnerId = orgData?.partnerId || "demo-org";

    console.log(`Organization: ${orgData?.name} (${finalOrgId})`);
    console.log(`Partner ID: ${partnerId}`);

    // Create or get user
    let user;
    try {
      user = await adminAuth.getUserByEmail(email);
      console.log(`Found existing user: ${user.uid}`);
    } catch {
      user = await adminAuth.createUser({
        email,
        password,
        displayName: email.split("@")[0],
      });
      console.log(`Created new user: ${user.uid}`);
    }

    // Set custom claims
    await adminAuth.setCustomUserClaims(user.uid, {
      role: "org_manager",
      partnerId,
      organizationId: finalOrgId,
    });

    console.log("\n✅ Success! User promoted to org_manager");
    console.log(`Email: ${email}`);
    console.log(`Role: org_manager`);
    console.log(`Organization ID: ${finalOrgId}`);
    console.log(`Partner ID: ${partnerId}`);
    console.log("\n⚠️  User must sign out and sign back in for claims to take effect.");

    // Also create/update user document in Firestore
    await adminDb.collection("users").doc(user.uid).set(
      {
        email,
        displayName: user.displayName || email.split("@")[0],
        role: "org_manager",
        partnerId,
        organizationId: finalOrgId,
        updatedAt: new Date(),
      },
      { merge: true },
    );

    console.log("✅ User document updated in Firestore");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

createOrgManager();


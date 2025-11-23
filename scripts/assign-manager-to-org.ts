/**
 * Script to assign a manager to an existing organization
 * Usage: npx tsx scripts/assign-manager-to-org.ts <orgName> <email> <password>
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

async function assignManager() {
  const orgName = process.argv[2];
  const email = process.argv[3];
  const password = process.argv[4];

  if (!orgName || !email || !password) {
    console.error("Usage: npx tsx scripts/assign-manager-to-org.ts <orgName> <email> <password>");
    console.error("Example: npx tsx scripts/assign-manager-to-org.ts \"Test Organization\" manager@test.org TestPass123!");
    process.exit(1);
  }

  // Dynamically import Firebase Admin AFTER env vars are loaded
  const { adminAuth, adminDb } = await import("../src/lib/firebaseAdmin");
  const { createTeleoperator } = await import("../src/lib/repositories/teleoperators");

  try {
    // Find organization by name
    const orgsSnapshot = await adminDb
      .collection("organizations")
      .where("name", "==", orgName)
      .limit(1)
      .get();

    if (orgsSnapshot.empty) {
      console.error(`❌ Organization "${orgName}" not found`);
      console.error("💡 Available organizations:");
      const allOrgs = await adminDb.collection("organizations").get();
      allOrgs.docs.forEach((doc) => {
        console.error(`   - ${doc.data().name} (${doc.id})`);
      });
      process.exit(1);
    }

    const orgDoc = orgsSnapshot.docs[0];
    const orgId = orgDoc.id;
    const orgData = orgDoc.data();
    const partnerId = orgData?.partnerId || "demo-org";

    console.log(`✅ Found organization: ${orgData?.name} (${orgId})`);
    console.log(`   Partner ID: ${partnerId}`);

    // Check if manager already exists
    const existingManagers = await adminDb
      .collection("teleoperators")
      .where("organizationId", "==", orgId)
      .where("role", "==", "org_manager")
      .limit(1)
      .get();

    if (!existingManagers.empty) {
      const existing = existingManagers.docs[0].data();
      console.log(`\n⚠️  Organization already has a manager: ${existing.email}`);
      console.log(`   Manager ID: ${existingManagers.docs[0].id}`);
      console.log(`\n💡 To create a new manager, use a different email or remove the existing one first.`);
      process.exit(1);
    }

    // Create manager user
    console.log(`\n📧 Creating manager user: ${email}`);
    const managerResult = await createTeleoperator(
      {
        email: email.trim(),
        displayName: email.split("@")[0],
        role: "org_manager",
        partnerOrgId: partnerId,
        organizationId: orgId,
        organizationName: orgData?.name || orgName,
        currentStatus: "offline",
        certifications: [], // Not required for managers
        robotTypesQualified: [], // Not required for managers
      },
      "system", // createdBy
    );

    console.log("\n✅ Success! Manager created and assigned to organization");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${managerResult.password}`);
    console.log(`   Role: org_manager`);
    console.log(`   Organization: ${orgData?.name} (${orgId})`);
    console.log(`\n⚠️  User must sign out and sign back in for claims to take effect.`);
    console.log(`\n📋 Credentials:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${managerResult.password}`);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

assignManager();


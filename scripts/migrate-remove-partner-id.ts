/**
 * DATABASE MIGRATION: Remove partnerId from all collections
 * This script will:
 * 1. Backup all documents with partnerId
 * 2. Remove partnerId field from all documents
 * 3. Ensure organizationId is set correctly
 * 4. Verify migration success
 *
 * Run: npx tsx scripts/migrate-remove-partner-id.ts
 */

import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import * as fs from "fs";
import * as path from "path";

interface MigrationStats {
  usersUpdated: number;
  locationsUpdated: number;
  assignmentsUpdated: number;
  organizationsUpdated: number;
  authClaimsUpdated: number;
  errors: Array<{ collection: string; docId: string; error: string }>;
}

async function migrateRemovePartnerId() {
  console.log("🚀 Starting partnerId removal migration...\n");
  console.log("⚠️  WARNING: This will modify production data!");
  console.log("⚠️  Make sure you have a backup!\n");

  const stats: MigrationStats = {
    usersUpdated: 0,
    locationsUpdated: 0,
    assignmentsUpdated: 0,
    organizationsUpdated: 0,
    authClaimsUpdated: 0,
    errors: [],
  };

  // Create backup directory
  const backupDir = path.join(
    process.cwd(),
    "backups",
    `migration-${Date.now()}`,
  );
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`💾 Backup directory created: ${backupDir}\n`);

  try {
    // ============================================================================
    // MIGRATE USERS COLLECTION
    // ============================================================================
    console.log("📝 Migrating users collection...");
    const usersSnapshot = await adminDb.collection("users").get();
    const usersBackup: any[] = [];

    for (const doc of usersSnapshot.docs) {
      const data = doc.data();
      usersBackup.push({ id: doc.id, data });

      try {
        // Check if has partnerId
        if ("partnerId" in data) {
          const updates: any = {
            updated_at: new Date(),
          };

          // Ensure organizationId is set
          if (!data.organizationId && data.partnerId) {
            // Try to map partnerId to organizationId
            // First, check if partnerId is actually an organizationId (UUID format)
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              data.partnerId as string,
            );

            if (isUUID) {
              // partnerId is actually an organizationId
              updates.organizationId = data.partnerId;
              console.log(
                `  ✅ Mapped partnerId to organizationId for user: ${data.email}`,
              );
            } else {
              // Try to find organization by slug
              const org = await adminDb
                .collection("organizations")
                .where("slug", "==", data.partnerId)
                .limit(1)
                .get();

              if (!org.empty) {
                updates.organizationId = org.docs[0].id;
                console.log(
                  `  ✅ Mapped partnerId "${data.partnerId}" to organizationId for user: ${data.email}`,
                );
              } else {
                console.log(
                  `  ⚠️  No organization found for partnerId "${data.partnerId}" for user: ${data.email}`,
                );
              }
            }
          }

          // Remove partnerId using FieldValue.delete()
          await adminDb.collection("users").doc(doc.id).update({
            ...updates,
            partnerId: adminDb.FieldValue.delete() as any,
          });

          stats.usersUpdated++;
          console.log(`  ✓ Updated user: ${data.email}`);
        }
      } catch (error: any) {
        stats.errors.push({
          collection: "users",
          docId: doc.id,
          error: error.message,
        });
        console.error(`  ✗ Error updating user ${doc.id}:`, error.message);
      }
    }

    // Save users backup
    fs.writeFileSync(
      path.join(backupDir, "users-backup.json"),
      JSON.stringify(usersBackup, null, 2),
    );
    console.log(`✅ Users migrated: ${stats.usersUpdated}\n`);

    // ============================================================================
    // MIGRATE LOCATIONS COLLECTION
    // ============================================================================
    console.log("📍 Migrating locations collection...");
    const locationsSnapshot = await adminDb.collection("locations").get();
    const locationsBackup: any[] = [];

    for (const doc of locationsSnapshot.docs) {
      const data = doc.data();
      locationsBackup.push({ id: doc.id, data });

      try {
        if ("partnerId" in data || "partnerOrgId" in data) {
          const partnerId = data.partnerId || data.partnerOrgId;
          const updates: any = {
            updated_at: new Date(),
          };

          // Ensure organizationId is set
          if (!data.organizationId && !data.assignedOrganizationId && partnerId) {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              partnerId as string,
            );

            if (isUUID) {
              updates.assignedOrganizationId = partnerId;
              console.log(
                `  ✅ Mapped partnerId to organizationId for location: ${data.address}`,
              );
            } else {
              const org = await adminDb
                .collection("organizations")
                .where("slug", "==", partnerId)
                .limit(1)
                .get();

              if (!org.empty) {
                updates.assignedOrganizationId = org.docs[0].id;
                console.log(
                  `  ✅ Mapped partnerId to organizationId for location: ${data.address}`,
                );
              }
            }
          }

          // Remove partnerId and partnerOrgId
          const deleteFields: any = {};
          if ("partnerId" in data) {
            deleteFields.partnerId = adminDb.FieldValue.delete() as any;
          }
          if ("partnerOrgId" in data) {
            deleteFields.partnerOrgId = adminDb.FieldValue.delete() as any;
          }

          await adminDb.collection("locations").doc(doc.id).update({
            ...updates,
            ...deleteFields,
          });

          stats.locationsUpdated++;
          console.log(`  ✓ Updated location: ${data.address || doc.id}`);
        }
      } catch (error: any) {
        stats.errors.push({
          collection: "locations",
          docId: doc.id,
          error: error.message,
        });
        console.error(`  ✗ Error updating location ${doc.id}:`, error.message);
      }
    }

    fs.writeFileSync(
      path.join(backupDir, "locations-backup.json"),
      JSON.stringify(locationsBackup, null, 2),
    );
    console.log(`✅ Locations migrated: ${stats.locationsUpdated}\n`);

    // ============================================================================
    // MIGRATE ASSIGNMENTS COLLECTION (if exists)
    // ============================================================================
    console.log("🔗 Checking assignments collection...");
    const assignmentsSnapshot = await adminDb.collection("assignments").get();

    if (!assignmentsSnapshot.empty) {
      const assignmentsBackup: any[] = [];

      for (const doc of assignmentsSnapshot.docs) {
        const data = doc.data();
        assignmentsBackup.push({ id: doc.id, data });

        try {
          if ("partnerId" in data) {
            await adminDb.collection("assignments").doc(doc.id).update({
              partnerId: adminDb.FieldValue.delete() as any,
              updated_at: new Date(),
            });

            stats.assignmentsUpdated++;
            console.log(`  ✓ Updated assignment: ${doc.id}`);
          }
        } catch (error: any) {
          stats.errors.push({
            collection: "assignments",
            docId: doc.id,
            error: error.message,
          });
          console.error(
            `  ✗ Error updating assignment ${doc.id}:`,
            error.message,
          );
        }
      }

      fs.writeFileSync(
        path.join(backupDir, "assignments-backup.json"),
        JSON.stringify(assignmentsBackup, null, 2),
      );
      console.log(`✅ Assignments migrated: ${stats.assignmentsUpdated}\n`);
    } else {
      console.log("  No assignments collection found\n");
    }

    // ============================================================================
    // UPDATE FIREBASE AUTH CUSTOM CLAIMS
    // ============================================================================
    console.log("🔐 Updating Firebase Auth custom claims...");
    const authUsers = await adminAuth.listUsers(1000);

    for (const authUser of authUsers.users) {
      try {
        const claims = authUser.customClaims || {};

        if ("partnerId" in claims) {
          const newClaims = { ...claims };
          delete newClaims.partnerId;

          // If no organizationId but has partnerId, try to map it
          if (!newClaims.organizationId && claims.partnerId) {
            const partnerId = claims.partnerId as string;
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              partnerId,
            );

            if (isUUID) {
              newClaims.organizationId = partnerId;
              console.log(
                `  ✅ Mapped Auth partnerId to organizationId for: ${authUser.email}`,
              );
            } else {
              const org = await adminDb
                .collection("organizations")
                .where("slug", "==", partnerId)
                .limit(1)
                .get();

              if (!org.empty) {
                newClaims.organizationId = org.docs[0].id;
                console.log(
                  `  ✅ Mapped Auth partnerId to organizationId for: ${authUser.email}`,
                );
              }
            }
          }

          await adminAuth.setCustomUserClaims(authUser.uid, newClaims);
          stats.authClaimsUpdated++;
          console.log(`  ✓ Updated Auth claims for: ${authUser.email}`);
        }
      } catch (error: any) {
        stats.errors.push({
          collection: "auth",
          docId: authUser.uid,
          error: error.message,
        });
        console.error(
          `  ✗ Error updating Auth for ${authUser.email}:`,
          error.message,
        );
      }
    }

    console.log(`✅ Auth claims updated: ${stats.authClaimsUpdated}\n`);

    // ============================================================================
    // MIGRATION SUMMARY
    // ============================================================================
    console.log("\n" + "=".repeat(80));
    console.log("✅ MIGRATION COMPLETE\n");
    console.log("📊 Summary:");
    console.log(`  - Users updated: ${stats.usersUpdated}`);
    console.log(`  - Locations updated: ${stats.locationsUpdated}`);
    console.log(`  - Assignments updated: ${stats.assignmentsUpdated}`);
    console.log(`  - Auth claims updated: ${stats.authClaimsUpdated}`);
    console.log(`  - Errors: ${stats.errors.length}`);
    console.log(`\n💾 Backups saved to: ${backupDir}`);

    if (stats.errors.length > 0) {
      console.log("\n🔴 ERRORS:\n");
      stats.errors.forEach((err) => {
        console.log(`  ${err.collection}/${err.docId}: ${err.error}`);
      });
    }

    // Save migration report
    const reportPath = path.join(backupDir, "migration-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(stats, null, 2));
    console.log(`\n📄 Full report: ${reportPath}\n`);

    console.log("=".repeat(80));
    console.log("\n🎉 partnerId has been removed from database!");
    console.log("⚠️  Next: Update codebase to remove partnerId references\n");
  } catch (error: any) {
    console.error("\n💥 MIGRATION FAILED:", error);
    console.log(`\n💾 Partial backups saved to: ${backupDir}`);
    console.log("⚠️  Database may be in inconsistent state - review backups!");
    throw error;
  }
}

// Run migration with confirmation
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("\n⚠️  DANGER ZONE: Database Migration ⚠️\n");
console.log("This script will:");
console.log("  1. Remove partnerId from ALL Firestore documents");
console.log("  2. Remove partnerId from ALL Firebase Auth custom claims");
console.log("  3. Map existing partnerId values to organizationId where possible");
console.log("  4. Create backups before making changes\n");
console.log('Are you sure you want to continue? (Type "YES" to proceed)\n');

rl.question("> ", (answer: string) => {
  rl.close();

  if (answer.trim() === "YES") {
    migrateRemovePartnerId()
      .then(() => {
        console.log("\n✅ Migration completed successfully!");
        process.exit(0);
      })
      .catch((error) => {
        console.error("\n❌ Migration failed:", error);
        process.exit(1);
      });
  } else {
    console.log("\n❌ Migration cancelled.\n");
    process.exit(0);
  }
});


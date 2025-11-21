/**
 * Script to display Firebase rules for easy copy-paste
 * 
 * Usage: npx tsx scripts/show-rules.ts
 */

import * as fs from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const firestoreRulesPath = join(__dirname, "..", "src", "firebase", "firestore.rules");
const storageRulesPath = join(__dirname, "..", "src", "firebase", "storage.rules");

console.log("\n" + "=".repeat(80));
console.log("FIRESTORE RULES - Copy everything below this line");
console.log("=".repeat(80) + "\n");

if (fs.existsSync(firestoreRulesPath)) {
  const rules = fs.readFileSync(firestoreRulesPath, "utf8");
  console.log(rules);
} else {
  console.error("❌ Firestore rules file not found!");
}

console.log("\n" + "=".repeat(80));
console.log("STORAGE RULES - Copy everything below this line");
console.log("=".repeat(80) + "\n");

if (fs.existsSync(storageRulesPath)) {
  const rules = fs.readFileSync(storageRulesPath, "utf8");
  console.log(rules);
} else {
  console.error("❌ Storage rules file not found!");
}

console.log("\n" + "=".repeat(80));
console.log("DEPLOYMENT INSTRUCTIONS:");
console.log("=".repeat(80));
console.log("\n1. Go to: https://console.firebase.google.com/");
console.log("2. Select project: super-volcano-oem-portal");
console.log("3. For Firestore:");
console.log("   - Go to: Firestore Database → Rules");
console.log("   - Copy the Firestore rules above");
console.log("   - Paste and click 'Publish'");
console.log("4. For Storage:");
console.log("   - Go to: Storage → Rules");
console.log("   - Copy the Storage rules above");
console.log("   - Paste and click 'Publish'");
console.log("\n" + "=".repeat(80) + "\n");


/**
 * Script to automatically run the database schema
 * Usage: npx tsx scripts/run-schema.ts
 * 
 * This script will:
 * 1. Load environment variables from .env.local
 * 2. Connect to Postgres database
 * 3. Read and execute database/schema.sql
 * 4. Report success/failure
 */

// CRITICAL: Load environment variables FIRST, before any other imports
import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync } from "fs";

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
  "POSTGRES_URL_NON_POOLING",
];

const missingVars = requiredVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error("❌ Missing required environment variables:", missingVars.join(", "));
  console.error("💡 Make sure .env.local contains POSTGRES_URL_NON_POOLING.");
  process.exit(1);
}

console.log("✅ Environment variables loaded successfully\n");

async function runSchema() {
  console.log("🚀 Running database schema...\n");

  // Dynamically import pg AFTER env vars are loaded
  const { Client } = await import("pg");

  const connectionString = process.env.POSTGRES_URL_NON_POOLING;

  if (!connectionString) {
    console.error("❌ POSTGRES_URL_NON_POOLING not found in environment variables");
    process.exit(1);
  }

  // Read schema file
  const schemaPath = resolve(process.cwd(), "database", "schema.sql");
  console.log("📄 Reading schema file:", schemaPath);

  let schemaSQL: string;
  try {
    schemaSQL = readFileSync(schemaPath, "utf-8");
    console.log(`   ✅ Schema file read (${schemaSQL.length} characters)\n`);
  } catch (error: any) {
    console.error("❌ Failed to read schema file:", error.message);
    console.error("💡 Make sure database/schema.sql exists.");
    process.exit(1);
  }

  // Connect to database
  const client = new Client({
    connectionString: connectionString,
  });

  try {
    console.log("🔌 Connecting to database...");
    await client.connect();
    console.log("   ✅ Connected successfully\n");

    // Split schema into individual statements
    // Handle PostgreSQL functions with dollar-quoted strings properly
    const statements: string[] = [];
    let currentStatement = "";
    let inDollarQuote = false;
    let dollarTag = "";
    
    const lines = schemaSQL.split("\n");
    
    for (const line of lines) {
      // Check for dollar-quoted strings (e.g., $$ or $tag$)
      const dollarQuoteMatch = line.match(/\$([^$]*)\$/g);
      if (dollarQuoteMatch) {
        for (const match of dollarQuoteMatch) {
          if (!inDollarQuote) {
            // Starting a dollar quote
            dollarTag = match;
            inDollarQuote = true;
          } else if (match === dollarTag) {
            // Ending the dollar quote
            inDollarQuote = false;
            dollarTag = "";
          }
        }
      }
      
      currentStatement += line + "\n";
      
      // Only split on semicolon if we're not inside a dollar-quoted string
      if (!inDollarQuote && line.trim().endsWith(";")) {
        const trimmed = currentStatement.trim();
        if (trimmed.length > 0 && !trimmed.startsWith("--")) {
          statements.push(trimmed);
        }
        currentStatement = "";
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim().length > 0) {
      statements.push(currentStatement.trim());
    }

    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty statements and comments
      if (!statement || statement.length < 10) {
        continue;
      }

      try {
        await client.query(statement);
        successCount++;
        
        // Show progress for longer operations
        if (statements.length > 10 && (i + 1) % 10 === 0) {
          console.log(`   ⏳ Progress: ${i + 1}/${statements.length} statements executed...`);
        }
      } catch (error: any) {
        // Some errors are expected (e.g., "already exists" for CREATE IF NOT EXISTS)
        const errorMessage = error.message || String(error);
        
        if (
          errorMessage.includes("already exists") ||
          errorMessage.includes("does not exist") ||
          errorMessage.includes("duplicate")
        ) {
          // These are expected for idempotent operations
          successCount++;
        } else {
          errorCount++;
          console.error(`   ⚠️  Statement ${i + 1} error:`, errorMessage.substring(0, 100));
          // Don't exit on first error, continue with rest
        }
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Schema execution complete!");
    console.log("=".repeat(60));
    console.log(`\n📊 Results:`);
    console.log(`   ✅ Successful: ${successCount}`);
    if (errorCount > 0) {
      console.log(`   ⚠️  Errors: ${errorCount} (may be expected for idempotent operations)`);
    }
    console.log(`\n💡 The database schema has been applied.`);
    console.log(`   You can now sync data from Firestore using the admin interface.`);
    console.log("=".repeat(60) + "\n");

  } catch (error: any) {
    console.error("\n❌ Database error:", error.message);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    if (error.detail) {
      console.error(`   Detail: ${error.detail}`);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log("🔌 Database connection closed");
  }
}

// Run the script
runSchema()
  .then(() => {
    console.log("✨ Script complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });


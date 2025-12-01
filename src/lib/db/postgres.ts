import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Missing POSTGRES_URL or DATABASE_URL environment variable');
}

const neonSql = neon(databaseUrl);

// Wrapper to maintain compatibility with @vercel/postgres interface
// Neon returns array directly, but some code expects { rows: [...] }
export const sql = async (strings: TemplateStringsArray, ...values: any[]) => {
  const result = await neonSql(strings, ...values);
  return result; // Neon already returns array, which works for Array.isArray checks
};

// For direct array access (new Neon style)
export { neonSql };

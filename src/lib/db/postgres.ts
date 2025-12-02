import { neon, Pool } from '@neondatabase/serverless';

const databaseUrl = process.env.POSTGRES_URL 
  || process.env.svdb_POSTGRES_URL 
  || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Missing database URL environment variable');
}

console.log('[DB] Connecting to:', databaseUrl.split('@')[1]?.split('/')[0] || 'unknown host');

// For tagged template literals (sql`SELECT ...`)
const neonSql = neon(databaseUrl);

// For raw query strings (sql.query("SELECT ...", [params]))
const pool = new Pool({ connectionString: databaseUrl });

export const sql = Object.assign(
  async (strings: TemplateStringsArray, ...values: any[]) => {
    const result = await neonSql(strings, ...values);
    const response = result as any;
    response.rows = result;
    response.rowCount = result.length;
    return response;
  },
  {
    query: async (queryText: string, params?: any[]) => {
      const result = await pool.query(queryText, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount || result.rows.length,
      };
    }
  }
);

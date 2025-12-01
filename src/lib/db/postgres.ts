import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Missing POSTGRES_URL or DATABASE_URL environment variable');
}

const neonSql = neon(databaseUrl);

// Wrapper that returns both array format AND .rows for compatibility
export const sql = Object.assign(
  async (strings: TemplateStringsArray, ...values: any[]) => {
    const result = await neonSql(strings, ...values);
    const response = result as any;
    response.rows = result;
    response.rowCount = result.length;
    return response;
  },
  {
    // Add .query() method for compatibility with @vercel/postgres
    query: async (queryText: string, params?: any[]) => {
      const result = await neonSql.query(queryText, params);
      return {
        rows: result,
        rowCount: result.length,
      };
    }
  }
);

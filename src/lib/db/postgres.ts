import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.POSTGRES_URL 
  || process.env.svdb_POSTGRES_URL 
  || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Missing database URL environment variable');
}

console.log('[DB] Connecting to:', databaseUrl.split('@')[1]?.split('/')[0] || 'unknown host');

const neonSql = neon(databaseUrl);

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
      const result = await neonSql(queryText, params || []);
      return {
        rows: result,
        rowCount: result.length,
      };
    }
  }
);

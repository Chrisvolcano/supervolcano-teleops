import { sql } from '@vercel/postgres';

// Connection is automatic via Vercel Postgres
// No need to manually configure connection

export { sql };

// Type-safe query helpers
export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

export async function query<T>(
  queryText: string,
  params?: any[]
): Promise<QueryResult<T>> {
  try {
    const result = await sql.query(queryText, params);
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount || 0,
    };
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}


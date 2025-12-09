/**
 * API KEY MANAGEMENT
 * Admins create API keys for OEM partners
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebaseAdmin';
import { Client } from 'pg';
import crypto from 'crypto';

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';

// Generate API key
function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `sk_${crypto.randomBytes(32).toString('hex')}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const prefix = key.substring(0, 10);
  return { key, hash, prefix };
}

// POST - Create API key
export async function POST(request: NextRequest) {
  let client: Client | null = null;

  try {
    // Auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);

    if (decodedToken.role !== 'admin' && decodedToken.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { organizationId, organizationName, expiresInDays } = await request.json();

    if (!organizationId || !organizationName) {
      return NextResponse.json(
        { error: 'organizationId and organizationName required' },
        { status: 400 }
      );
    }

    // Generate API key
    const { key, hash, prefix } = generateApiKey();
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Connect to PostgreSQL
    client = new Client({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DATABASE,
      port: 5432,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();

    // Insert API key
    const result = await client.query(
      `INSERT INTO api_keys (
        key_hash, key_prefix, organization_id, organization_name,
        created_by, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id`,
      [hash, prefix, organizationId, organizationName, decodedToken.uid, expiresAt]
    );

    const keyId = result.rows[0].id;

    return NextResponse.json({
      success: true,
      apiKey: key,  // ONLY time the full key is shown
      keyId,
      organizationId,
      organizationName,
      expiresAt,
      warning: 'Save this API key now. You will not be able to see it again.',
    });
  } catch (error: any) {
    console.error('[API Keys] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// GET - List API keys
export async function GET(request: NextRequest) {
  let client: Client | null = null;

  try {
    // Auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);

    if (decodedToken.role !== 'admin' && decodedToken.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    client = new Client({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DATABASE,
      port: 5432,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();

    const result = await client.query(
      `SELECT 
        id, key_prefix, organization_id, organization_name,
        is_active, rate_limit_per_hour, created_at, last_used_at, expires_at
       FROM api_keys
       ORDER BY created_at DESC`
    );

    return NextResponse.json({
      success: true,
      apiKeys: result.rows,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.end();
    }
  }
}


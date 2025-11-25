import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';
import { sql } from '@/lib/db/postgres';

export const dynamic = 'force-dynamic';

// GET - Fetch all locations
export async function GET(request: NextRequest) {
  try {
    // Admin auth check
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);
    
    // Query Firestore (source of truth)
    const locationsSnap = await adminDb.collection('locations').get();
    
    const locations = locationsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        locationId: doc.id,
        name: data.name || 'Unnamed',
        address: data.address || '',
        assignedOrganizationId: data.assignedOrganizationId || null,
        assignedOrganizationName: data.assignedOrganizationName || null,
        partnerOrgId: data.partnerOrgId || null,
        contactName: data.contactName || data.primaryContact?.name || null,
        contactPhone: data.contactPhone || data.primaryContact?.phone || null,
        contactEmail: data.contactEmail || data.primaryContact?.email || null,
        accessInstructions: data.accessInstructions || null,
        status: data.status || 'active',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        ...data
      };
    });
    
    return NextResponse.json({
      success: true,
      locations
    });
  } catch (error: any) {
    console.error('GET /api/admin/locations error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}

// POST - Create new location
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/admin/locations - Starting location creation');
    
    // Auth check
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.error('POST /api/admin/locations - No token provided');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const claims = await getUserClaims(token);
    if (!claims) {
      console.error('POST /api/admin/locations - Invalid token');
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);
    
    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log('POST /api/admin/locations - Request body:', JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error('POST /api/admin/locations - JSON parse error:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    // Validate required fields
    if (!body.name) {
      console.error('POST /api/admin/locations - Missing name field');
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }
    
    if (!body.partnerOrgId) {
      console.error('POST /api/admin/locations - Missing partnerOrgId field');
      return NextResponse.json(
        { success: false, error: 'Partner organization ID is required' },
        { status: 400 }
      );
    }
    
    // Prepare location data
    const locationData = {
      name: body.name,
      address: body.address || '',
      addressData: body.addressData || null,
      partnerOrgId: body.partnerOrgId,
      assignedOrganizationId: body.partnerOrgId, // Same as partnerOrgId for now
      status: 'active',
      createdAt: new Date(),
      createdBy: claims.email || 'unknown',
      updatedAt: new Date(),
    };
    
    console.log('POST /api/admin/locations - Creating location in Firestore:', locationData);
    
    // Create location in Firestore
    const locationRef = await adminDb.collection('locations').add(locationData);
    const locationId = locationRef.id;
    
    console.log('POST /api/admin/locations - Location created with ID:', locationId);
    
    // Also create in PostgreSQL if needed (for spatial taxonomy)
    try {
      await sql`
        INSERT INTO locations (id, name, address, partner_org_id, status, created_at, updated_at)
        VALUES (${locationId}, ${body.name}, ${body.address || ''}, ${body.partnerOrgId}, 'active', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          address = EXCLUDED.address,
          updated_at = NOW()
      `;
      console.log('POST /api/admin/locations - Location also created in PostgreSQL');
    } catch (dbError: any) {
      console.warn('POST /api/admin/locations - Failed to create in PostgreSQL (non-fatal):', dbError.message);
      // Don't fail the whole operation if PostgreSQL insert fails
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      locationId: locationId,
      location: {
        id: locationId,
        ...locationData,
        createdAt: locationData.createdAt.toISOString(),
        updatedAt: locationData.updatedAt.toISOString(),
      },
      message: 'Location created successfully'
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('POST /api/admin/locations - Error:', error);
    console.error('POST /api/admin/locations - Error stack:', error.stack);
    
    // Return proper JSON error
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create location' 
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}


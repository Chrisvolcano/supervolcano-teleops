import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
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
    
    // Get user email and partner ID from token
    let userEmail = 'system';
    let userPartnerId: string | undefined = undefined;
    try {
      // Decode token again to get email and partnerId
      const decodedToken = await adminAuth.verifyIdToken(token);
      const userRecord = await adminAuth.getUser(decodedToken.uid);
      userEmail = userRecord.email || 'system';
      // Get partnerId from decoded token (custom claim)
      userPartnerId = (decodedToken as any).partnerId as string | undefined;
      console.log('POST /api/admin/locations - User partnerId from token:', userPartnerId);
    } catch (emailError) {
      console.warn('POST /api/admin/locations - Could not fetch user info:', emailError);
      // Use fallback
      userEmail = 'system';
    }
    
    // Also get partnerId from claims (already decoded)
    const partnerIdFromClaims = claims.partnerId;
    const finalPartnerId = partnerIdFromClaims || userPartnerId;
    console.log('POST /api/admin/locations - Partner ID from claims:', partnerIdFromClaims);
    console.log('POST /api/admin/locations - Final partner ID to use:', finalPartnerId);
    
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
    
    // Auto-assign partnerOrgId from user context if not provided
    const partnerOrgId = body.partnerOrgId || finalPartnerId || body.organizationId;
    
    if (!partnerOrgId) {
      console.error('POST /api/admin/locations - No partnerOrgId available from request or user context');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Partner organization ID is required. Please ensure your account is associated with an organization.' 
        },
        { status: 400 }
      );
    }
    
    console.log('POST /api/admin/locations - Using partnerOrgId:', partnerOrgId);
    
    // Prepare location data
    const locationData = {
      name: body.name,
      address: body.address || '',
      addressData: body.addressData || null,
      partnerOrgId: partnerOrgId,
      assignedOrganizationId: body.organizationId || partnerOrgId, // Use provided orgId or fallback to partnerOrgId
      status: 'active',
      createdAt: new Date(),
      createdBy: userEmail,
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


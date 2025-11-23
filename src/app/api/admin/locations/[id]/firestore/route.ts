import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const locationDoc = await adminDb.collection('locations').doc(params.id).get();
    
    if (!locationDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      );
    }
    
    const data = locationDoc.data();
    const location = {
      id: locationDoc.id,
      locationId: locationDoc.id,
      name: data?.name || 'Unnamed',
      address: data?.address || '',
      assignedOrganizationId: data?.assignedOrganizationId || null,
      assignedOrganizationName: data?.assignedOrganizationName || null,
      organization_name: data?.assignedOrganizationName || null,
      partnerOrgId: data?.partnerOrgId || null,
      contactName: data?.contactName || data?.primaryContact?.name || null,
      contact_name: data?.contactName || data?.primaryContact?.name || null,
      contactPhone: data?.contactPhone || data?.primaryContact?.phone || null,
      contact_phone: data?.contactPhone || data?.primaryContact?.phone || null,
      contactEmail: data?.contactEmail || data?.primaryContact?.email || null,
      contact_email: data?.contactEmail || data?.primaryContact?.email || null,
      accessInstructions: data?.accessInstructions || null,
      access_instructions: data?.accessInstructions || null,
      status: data?.status || 'active',
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || null,
      ...data
    };
    
    return NextResponse.json({
      success: true,
      location
    });
  } catch (error: any) {
    console.error('Failed to get location from Firestore:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get location' },
      { status: 500 }
    );
  }
}


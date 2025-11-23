import { NextRequest, NextResponse } from 'next/server';
import { setLocationPreference, deleteLocationPreference } from '@/lib/repositories/sql/locationPreferences';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Allow org_manager, admin, and superadmin
    requireRole(claims, ['org_manager', 'admin', 'superadmin', 'partner_admin']);
    
    // TODO: Verify user has access to this location
    
    const body = await request.json();
    const { locationId, taskId, customInstruction, createdBy } = body; // Changed from momentId
    
    if (!locationId || !taskId || !customInstruction || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields: locationId, taskId, customInstruction, createdBy' },
        { status: 400 }
      );
    }
    
    const result = await setLocationPreference({
      locationId,
      taskId, // Changed from momentId
      customInstruction,
      createdBy,
    });
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error: any) {
    console.error('Set preference error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to set preference' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Auth check
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Allow org_manager, admin, and superadmin
    requireRole(claims, ['org_manager', 'admin', 'superadmin', 'partner_admin']);
    
    const body = await request.json();
    const { preferenceId } = body;
    
    if (!preferenceId) {
      return NextResponse.json(
        { error: 'Missing preference ID' },
        { status: 400 }
      );
    }
    
    const result = await deleteLocationPreference(preferenceId);
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error: any) {
    console.error('Delete preference error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete preference' },
      { status: 500 }
    );
  }
}


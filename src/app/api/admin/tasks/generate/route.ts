import { NextRequest, NextResponse } from 'next/server';
import { generateTasksFromInstructions } from '@/lib/repositories/sql/tasks';
import { getUserClaims, requireRole } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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
    
    const body = await request.json();
    const { jobId, locationId, organizationId, createdBy } = body; // Changed taskId to jobId
    
    if (!jobId || !locationId || !organizationId || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields: jobId, locationId, organizationId, createdBy' },
        { status: 400 }
      );
    }
    
    const result = await generateTasksFromInstructions(
      jobId,
      locationId,
      organizationId,
      createdBy
    );
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error: any) {
    console.error('Generate tasks error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate tasks' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { testTaskFlow } from '@/lib/scripts/testTaskFlow';
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
    
    requireRole(claims, ['superadmin', 'admin']);
    
    const result = await testTaskFlow();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Test failed:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Send POST request to run task flow test',
    endpoint: '/api/admin/test/task-flow',
    note: 'Requires admin authentication'
  });
}


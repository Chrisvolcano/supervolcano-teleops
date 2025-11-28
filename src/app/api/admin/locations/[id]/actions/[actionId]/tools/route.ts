/**
 * TOOLS API ENDPOINT
 * 
 * Handles tool assignment to actions.
 * Uses Firestore (source of truth for admin portal).
 * 
 * Last updated: 2025-11-26
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { getUserClaims, requireRole } from '@/lib/utils/auth';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/locations/[id]/actions/[actionId]/tools
 * Add a tool to an action
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; actionId: string } }
) {
  try {
    // -----------------------------------------------------------------------
    // 1. AUTHENTICATION
    // -----------------------------------------------------------------------
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify token and get user ID
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;
    
    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Permission check
    requireRole(claims, ['superadmin', 'admin', 'partner_admin']);

    const { id: locationId, actionId } = params;
    const body = await request.json();
    const { tool_name } = body;
    
    console.log('[POST Tool] Adding tool:', { tool_name, actionId, locationId });
    
    // -----------------------------------------------------------------------
    // 2. VALIDATE INPUT
    // -----------------------------------------------------------------------
    if (!tool_name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Tool name is required' },
        { status: 400 }
      );
    }
    
    if (!actionId || actionId === 'undefined' || actionId.includes('undefined')) {
      return NextResponse.json(
        { success: false, error: 'Invalid action ID' },
        { status: 400 }
      );
    }
    
    // -----------------------------------------------------------------------
    // 3. VERIFY ACTION EXISTS
    // -----------------------------------------------------------------------
    const actionDoc = await adminDb.collection('actions').doc(actionId).get();
    
    if (!actionDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Action not found' },
        { status: 404 }
      );
    }
    
    // -----------------------------------------------------------------------
    // 4. CHECK FOR DUPLICATE TOOL NAME IN ACTION
    // -----------------------------------------------------------------------
    const normalizedToolName = tool_name.trim().toLowerCase();
    
    const existingToolsSnapshot = await adminDb
      .collection('tools')
      .where('action_id', '==', actionId)
      .get();
    
    const duplicateTool = existingToolsSnapshot.docs.find(doc => {
      const toolData = doc.data();
      return toolData.tool_name?.toLowerCase() === normalizedToolName;
    });
    
    if (duplicateTool) {
      return NextResponse.json(
        { 
          success: false,
          error: 'This tool is already assigned to this action',
          hint: 'Tool names must be unique within an action'
        },
        { status: 400 }
      );
    }
    
    // -----------------------------------------------------------------------
    // 5. CREATE TOOL DOCUMENT IN FIRESTORE
    // -----------------------------------------------------------------------
    const newTool = {
      tool_name: tool_name.trim(),
      action_id: actionId,
      location_id: locationId,
      created_by: userId, // FIXED: Use userId from decoded token
      created_at: FieldValue.serverTimestamp(),
    };
    
    const toolRef = await adminDb.collection('tools').add(newTool);
    
    console.log('[POST Tool] Created tool:', toolRef.id);
    
    // -----------------------------------------------------------------------
    // 6. RETURN SUCCESS WITH CREATED TOOL
    // -----------------------------------------------------------------------
    return NextResponse.json({
      success: true,
      tool: {
        id: toolRef.id,
        ...newTool,
        created_at: new Date().toISOString(),
      },
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('[POST Tool] Error:', error);
    
    // Handle permission errors
    if (error.message?.includes('Forbidden') || error.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to add tool',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}


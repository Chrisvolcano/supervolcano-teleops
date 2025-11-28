import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/postgres';

export const dynamic = 'force-dynamic';

/**
 * Robot Feedback API
 * POST /api/robot/v1/feedback
 * 
 * Robots report execution results
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.ROBOT_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const {
      taskId, // Changed from momentId
      robotId,
      locationId,
      success,
      startedAt,
      completedAt,
      durationSeconds,
      errorMessage,
      notes,
      robotType,
      softwareVersion
    } = body;
    
    if (!taskId || !robotId || !locationId || success === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Insert execution log
    await sql`
      INSERT INTO robot_executions (
        task_id, robot_id, location_id, started_at, completed_at,
        duration_seconds, success, error_message, execution_notes,
        robot_type, software_version
      ) VALUES (
        ${taskId}, ${robotId}, ${locationId}, ${startedAt}, ${completedAt},
        ${durationSeconds}, ${success}, ${errorMessage || null}, ${notes || null},
        ${robotType || null}, ${softwareVersion || null}
      )
    `;
    
    // Trigger will auto-update task stats
    
    return NextResponse.json({
      success: true,
      message: 'Feedback recorded',
    });
    
  } catch (error) {
    console.error('Feedback error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


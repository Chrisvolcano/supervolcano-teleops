import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Robot API Health Check
 * GET /api/robot/health
 */
export async function GET(request: NextRequest) {
  // Optional: Check API key for health endpoint
  const apiKey = request.headers.get('X-Robot-API-Key');
  
  // Health check can work without auth, but log if key is provided
  if (apiKey && apiKey !== process.env.ROBOT_API_KEY) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Invalid API key',
        status: 'unhealthy'
      },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      locations: '/api/robot/locations',
      location_detail: '/api/robot/locations/{id}',
      jobs: '/api/robot/jobs',
      sessions: '/api/robot/sessions',
      media: '/api/robot/media',
    },
  });
}


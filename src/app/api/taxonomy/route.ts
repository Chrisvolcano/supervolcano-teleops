import { NextResponse } from 'next/server';
import { TASK_TAXONOMY, TAXONOMY_LABELS, generateTaskTitle } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';

/**
 * GET /api/taxonomy
 * 
 * Public endpoint for robot OEMs and external integrations.
 * Returns the complete structured task vocabulary.
 * 
 * This API is STABLE and VERSIONED - changes are additive only.
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    version: '1.0.0',
    taxonomy: TASK_TAXONOMY,
    labels: TAXONOMY_LABELS,
    metadata: {
      description: 'SuperVolcano structured task taxonomy for robot instructions',
      lastUpdated: '2025-11-24',
      contact: 'api@supervolcano.ai',
    },
    documentation: {
      structure: {
        floor: 'Physical floor level in the building (required)',
        room: 'Type of room where task is performed (required)',
        target: 'Specific object or surface to interact with (optional)',
        action: 'Action verb describing what to do (required)',
        roomModifier: 'Optional qualifier for room specificity (e.g., primary, guest)',
      },
      examples: [
        {
          structure: {
            floor: 'first_floor',
            room: 'bathroom',
            target: 'mirror',
            action: 'clean',
            roomModifier: 'primary',
          },
          generatedTitle: generateTaskTitle({
            floor: 'first_floor',
            room: 'bathroom',
            target: 'mirror',
            action: 'clean',
            roomModifier: 'primary',
          }),
          explanation: 'A specific cleaning task with full context',
        },
        {
          structure: {
            floor: 'second_floor',
            room: 'kitchen',
            target: 'counter',
            action: 'wipe',
          },
          generatedTitle: generateTaskTitle({
            floor: 'second_floor',
            room: 'kitchen',
            target: 'counter',
            action: 'wipe',
          }),
          explanation: 'Room modifier is optional',
        },
        {
          structure: {
            floor: 'basement',
            room: 'laundry_room',
            action: 'vacuum',
          },
          generatedTitle: generateTaskTitle({
            floor: 'basement',
            room: 'laundry_room',
            action: 'vacuum',
          }),
          explanation: 'Target is optional for room-level tasks',
        },
      ],
      usage: {
        querying: 'Use structure fields to filter tasks by component',
        composition: 'Combine taxonomy elements to create new task variants',
        analytics: 'Aggregate by action, room, or target for insights',
      },
    },
  }, {
    headers: {
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Content-Type': 'application/json',
    },
  });
}




/**
 * SuperVolcano Task Taxonomy
 * 
 * Structured vocabulary for robot tasks. This enables:
 * - Precise robot queries by location, action, target
 * - Analytics by task component
 * - Cross-location pattern recognition
 * - Composable task templates
 * 
 * @example
 * Structure: { floor: "first_floor", room: "bathroom", target: "mirror", action: "clean", roomModifier: "primary" }
 * Generated Title: "Clean 1st Floor Primary Bathroom Mirror"
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TaskStructure {
  floor: string;           // Required: Physical floor level
  room: string;            // Required: Room type
  target?: string;         // Optional: Specific object/surface
  action: string;          // Required: Action verb
  roomModifier?: string;   // Optional: Room qualifier (primary, guest, etc)
}

export interface TaskTaxonomy {
  floors: readonly string[];
  rooms: readonly string[];
  targets: Readonly<Record<string, readonly string[]>>;
  actions: readonly string[];
  roomModifiers: readonly string[];
}

// ============================================================================
// TAXONOMY CONSTANTS
// ============================================================================

export const TASK_TAXONOMY: TaskTaxonomy = {
  // Physical floor levels - expand as needed per location
  floors: [
    'basement',
    'first_floor',
    'second_floor',
    'third_floor',
    'attic',
  ] as const,

  // Room types - common across residential properties
  rooms: [
    'kitchen',
    'bathroom',
    'bedroom',
    'living_room',
    'dining_room',
    'office',
    'hallway',
    'garage',
    'laundry_room',
    'entryway',
    'closet',
    'pantry',
    'mudroom',
  ] as const,

  // Context-aware targets by room
  // This creates intelligent dropdown behavior
  targets: {
    kitchen: [
      'counter',
      'sink',
      'stove',
      'oven',
      'refrigerator',
      'dishwasher',
      'microwave',
      'floor',
      'table',
      'cabinets',
      'island',
      'backsplash',
      'trash_can',
    ],
    bathroom: [
      'sink',
      'mirror',
      'toilet',
      'shower',
      'bathtub',
      'counter',
      'floor',
      'towel_rack',
      'trash_can',
      'toilet_paper_holder',
    ],
    bedroom: [
      'bed',
      'floor',
      'dresser',
      'nightstand',
      'closet',
      'window',
      'ceiling_fan',
    ],
    living_room: [
      'floor',
      'couch',
      'coffee_table',
      'tv',
      'window',
      'shelf',
      'entertainment_center',
    ],
    dining_room: [
      'table',
      'chair',
      'floor',
      'window',
      'sideboard',
    ],
    office: [
      'desk',
      'floor',
      'shelf',
      'window',
      'chair',
    ],
    hallway: [
      'floor',
      'wall',
      'picture_frame',
      'light_fixture',
    ],
    garage: [
      'floor',
      'shelf',
      'workbench',
      'door',
      'wall',
    ],
    laundry_room: [
      'washer',
      'dryer',
      'sink',
      'counter',
      'floor',
      'shelf',
    ],
    entryway: [
      'floor',
      'door',
      'mat',
      'coat_rack',
    ],
    closet: [
      'floor',
      'shelf',
      'rod',
      'organizer',
    ],
    pantry: [
      'shelf',
      'floor',
      'door',
    ],
    mudroom: [
      'floor',
      'bench',
      'hook',
      'mat',
    ],
  } as const,

  // Action verbs - what the robot does
  actions: [
    'clean',
    'wipe',
    'sweep',
    'mop',
    'vacuum',
    'dust',
    'organize',
    'sanitize',
    'polish',
    'scrub',
    'empty',
    'refill',
    'straighten',
    'fold',
  ] as const,

  // Room modifiers for specificity
  roomModifiers: [
    'primary',      // Primary bedroom/bathroom (preferred over "master")
    'guest',        // Guest room/bathroom
    'main',         // Main floor/area
    'half',         // Half bathroom
    'kids',         // Children's room
    'upstairs',     // Upper level
    'downstairs',   // Lower level
  ] as const,
};

// ============================================================================
// HUMAN-READABLE LABELS
// ============================================================================

export const TAXONOMY_LABELS: Record<string, Record<string, string>> = {
  floors: {
    basement: 'Basement',
    first_floor: '1st Floor',
    second_floor: '2nd Floor',
    third_floor: '3rd Floor',
    attic: 'Attic',
  },
  rooms: {
    kitchen: 'Kitchen',
    bathroom: 'Bathroom',
    bedroom: 'Bedroom',
    living_room: 'Living Room',
    dining_room: 'Dining Room',
    office: 'Office',
    hallway: 'Hallway',
    garage: 'Garage',
    laundry_room: 'Laundry Room',
    entryway: 'Entryway',
    closet: 'Closet',
    pantry: 'Pantry',
    mudroom: 'Mudroom',
  },
  actions: {
    clean: 'Clean',
    wipe: 'Wipe',
    sweep: 'Sweep',
    mop: 'Mop',
    vacuum: 'Vacuum',
    dust: 'Dust',
    organize: 'Organize',
    sanitize: 'Sanitize',
    polish: 'Polish',
    scrub: 'Scrub',
    empty: 'Empty',
    refill: 'Refill',
    straighten: 'Straighten',
    fold: 'Fold',
  },
  roomModifiers: {
    primary: 'Primary',
    guest: 'Guest',
    main: 'Main',
    half: 'Half',
    kids: "Kids'",
    upstairs: 'Upstairs',
    downstairs: 'Downstairs',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate human-readable task title from structure
 * 
 * @example
 * generateTaskTitle({
 *   floor: "first_floor",
 *   room: "bathroom", 
 *   target: "mirror",
 *   action: "clean",
 *   roomModifier: "primary"
 * })
 * // Returns: "Clean 1st Floor Primary Bathroom Mirror"
 */
export function generateTaskTitle(structure: TaskStructure): string {
  const parts: string[] = [];
  
  // Action (verb) comes first
  const action = TAXONOMY_LABELS.actions[structure.action] || structure.action;
  parts.push(action);
  
  // Floor
  const floor = TAXONOMY_LABELS.floors[structure.floor] || structure.floor;
  parts.push(floor);
  
  // Room modifier (if present)
  if (structure.roomModifier) {
    const modifier = TAXONOMY_LABELS.roomModifiers[structure.roomModifier] || structure.roomModifier;
    parts.push(modifier);
  }
  
  // Room
  const room = TAXONOMY_LABELS.rooms[structure.room] || structure.room;
  parts.push(room);
  
  // Target (if present)
  if (structure.target) {
    parts.push(structure.target.replace(/_/g, ' '));
  }
  
  return parts.join(' ');
}

/**
 * Get available targets for a specific room
 * Used for context-aware dropdown filtering
 */
export function getTargetsForRoom(room: string): readonly string[] {
  return TASK_TAXONOMY.targets[room] || [];
}

/**
 * Validate task structure
 * Returns validation result with specific error messages
 */
export function validateTaskStructure(structure: Partial<TaskStructure>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Floor validation
  if (!structure.floor) {
    errors.push('Floor is required');
  } else if (!TASK_TAXONOMY.floors.includes(structure.floor as any)) {
    errors.push(`Invalid floor: ${structure.floor}`);
  }

  // Room validation
  if (!structure.room) {
    errors.push('Room is required');
  } else if (!TASK_TAXONOMY.rooms.includes(structure.room as any)) {
    errors.push(`Invalid room: ${structure.room}`);
  }

  // Action validation
  if (!structure.action) {
    errors.push('Action is required');
  } else if (!TASK_TAXONOMY.actions.includes(structure.action as any)) {
    errors.push(`Invalid action: ${structure.action}`);
  }

  // Room modifier validation (optional field)
  if (structure.roomModifier && 
      !TASK_TAXONOMY.roomModifiers.includes(structure.roomModifier as any)) {
    errors.push(`Invalid room modifier: ${structure.roomModifier}`);
  }

  // Target validation (optional field, but must be valid for the room if provided)
  if (structure.target && structure.room) {
    const validTargets = getTargetsForRoom(structure.room);
    if (validTargets.length > 0 && !validTargets.includes(structure.target as any)) {
      errors.push(`Invalid target "${structure.target}" for room "${structure.room}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Parse a free-text title into structured components (best effort)
 * Used for migrating legacy tasks
 * 
 * @example
 * parseTaskTitle("Clean 1st Floor Primary Bathroom Mirror")
 * // Returns: { floor: "first_floor", room: "bathroom", target: "mirror", action: "clean", roomModifier: "primary" }
 */
export function parseTaskTitle(title: string): Partial<TaskStructure> | null {
  const lowerTitle = title.toLowerCase();
  const structure: Partial<TaskStructure> = {};
  
  // Try to extract action
  for (const action of TASK_TAXONOMY.actions) {
    if (lowerTitle.includes(action)) {
      structure.action = action;
      break;
    }
  }
  
  // Try to extract floor
  for (const floor of TASK_TAXONOMY.floors) {
    const floorLabel = TAXONOMY_LABELS.floors[floor].toLowerCase();
    if (lowerTitle.includes(floorLabel) || lowerTitle.includes(floor)) {
      structure.floor = floor;
      break;
    }
  }
  
  // Try to extract room
  for (const room of TASK_TAXONOMY.rooms) {
    const roomLabel = TAXONOMY_LABELS.rooms[room].toLowerCase();
    if (lowerTitle.includes(roomLabel) || lowerTitle.includes(room.replace(/_/g, ' '))) {
      structure.room = room;
      break;
    }
  }
  
  // Try to extract room modifier
  for (const modifier of TASK_TAXONOMY.roomModifiers) {
    const modifierLabel = TAXONOMY_LABELS.roomModifiers[modifier].toLowerCase();
    if (lowerTitle.includes(modifierLabel) || lowerTitle.includes(modifier)) {
      structure.roomModifier = modifier;
      break;
    }
  }
  
  // Try to extract target (if we know the room)
  if (structure.room) {
    const validTargets = getTargetsForRoom(structure.room);
    for (const target of validTargets) {
      if (lowerTitle.includes(target.replace(/_/g, ' '))) {
        structure.target = target;
        break;
      }
    }
  }
  
  // Only return if we extracted at least action and room
  return (structure.action && structure.room) ? structure : null;
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Floor = typeof TASK_TAXONOMY.floors[number];
export type Room = typeof TASK_TAXONOMY.rooms[number];
export type Action = typeof TASK_TAXONOMY.actions[number];
export type RoomModifier = typeof TASK_TAXONOMY.roomModifiers[number];
export type Target = string; // Dynamic based on room




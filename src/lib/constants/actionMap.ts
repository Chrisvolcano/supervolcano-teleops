/**
 * Hierarchical Action Map
 * Defines Room → Target → Action → Tools relationships
 * Used for intelligent filtering throughout the location builder flow
 */

export interface ActionDefinition {
  name: string;
  description?: string;
  tools: string[];
}

export interface TargetDefinition {
  name: string;
  actions: ActionDefinition[];
}

export interface RoomDefinition {
  name: string;
  targets: TargetDefinition[];
}

// Complete hierarchical action map
export const ACTION_MAP: Record<string, RoomDefinition> = {
  // KITCHEN
  'kitchen': {
    name: 'Kitchen',
    targets: [
      {
        name: 'Counter',
        actions: [
          { name: 'Wipe Down', tools: ['Microfiber Cloth', 'All-Purpose Cleaner', 'Disinfectant'] },
          { name: 'Sanitize', tools: ['Disinfectant', 'Paper Towels', 'Gloves'] },
          { name: 'Organize', tools: ['Storage Bins', 'Cleaning Cloth'] },
        ],
      },
      {
        name: 'Sink',
        actions: [
          { name: 'Clean', tools: ['Scrub Brush', 'Sink Cleaner', 'Sponge'] },
          { name: 'Sanitize', tools: ['Disinfectant', 'Microfiber Cloth', 'Gloves'] },
          { name: 'Polish', tools: ['Polish', 'Microfiber Cloth'] },
        ],
      },
      {
        name: 'Stove',
        actions: [
          { name: 'Clean', tools: ['Stove Cleaner', 'Scrub Pad', 'Microfiber Cloth', 'Gloves'] },
          { name: 'Degrease', tools: ['Degreaser', 'Scrub Pad', 'Paper Towels', 'Gloves'] },
          { name: 'Wipe Down', tools: ['Microfiber Cloth', 'All-Purpose Cleaner'] },
        ],
      },
      {
        name: 'Floor',
        actions: [
          { name: 'Sweep', tools: ['Broom', 'Dust Pan'] },
          { name: 'Mop', tools: ['Mop', 'Bucket', 'Floor Cleaner'] },
          { name: 'Vacuum', tools: ['Vacuum Cleaner'] },
        ],
      },
      {
        name: 'Refrigerator',
        actions: [
          { name: 'Wipe Down', tools: ['Microfiber Cloth', 'All-Purpose Cleaner'] },
          { name: 'Clean Inside', tools: ['Sponge', 'All-Purpose Cleaner', 'Trash Bags'] },
          { name: 'Organize', tools: ['Storage Bins', 'Cleaning Cloth'] },
        ],
      },
    ],
  },

  // BATHROOM
  'bathroom': {
    name: 'Bathroom',
    targets: [
      {
        name: 'Toilet',
        actions: [
          { name: 'Clean', tools: ['Toilet Brush', 'Toilet Cleaner', 'Gloves'] },
          { name: 'Sanitize', tools: ['Disinfectant', 'Paper Towels', 'Gloves'] },
          { name: 'Scrub', tools: ['Scrub Brush', 'Toilet Cleaner', 'Gloves'] },
        ],
      },
      {
        name: 'Sink',
        actions: [
          { name: 'Clean', tools: ['Scrub Brush', 'Bathroom Cleaner', 'Sponge'] },
          { name: 'Sanitize', tools: ['Disinfectant', 'Microfiber Cloth', 'Gloves'] },
          { name: 'Polish', tools: ['Polish', 'Microfiber Cloth'] },
        ],
      },
      {
        name: 'Shower',
        actions: [
          { name: 'Scrub', tools: ['Scrub Brush', 'Shower Cleaner', 'Gloves', 'Sponge'] },
          { name: 'Clean Glass', tools: ['Glass Cleaner', 'Squeegee', 'Microfiber Cloth'] },
          { name: 'Remove Soap Scum', tools: ['Soap Scum Remover', 'Scrub Pad', 'Gloves'] },
        ],
      },
      {
        name: 'Mirror',
        actions: [
          { name: 'Clean', tools: ['Glass Cleaner', 'Microfiber Cloth', 'Paper Towels'] },
          { name: 'Polish', tools: ['Glass Cleaner', 'Microfiber Cloth'] },
        ],
      },
      {
        name: 'Floor',
        actions: [
          { name: 'Sweep', tools: ['Broom', 'Dust Pan'] },
          { name: 'Mop', tools: ['Mop', 'Bucket', 'Floor Cleaner'] },
          { name: 'Sanitize', tools: ['Disinfectant', 'Mop', 'Bucket'] },
        ],
      },
    ],
  },

  // BEDROOM
  'bedroom': {
    name: 'Bedroom',
    targets: [
      {
        name: 'Bed',
        actions: [
          { name: 'Make Bed', tools: ['Fresh Linens'] },
          { name: 'Change Sheets', tools: ['Fresh Sheets', 'Laundry Bag'] },
          { name: 'Dust', tools: ['Duster', 'Microfiber Cloth'] },
        ],
      },
      {
        name: 'Dresser',
        actions: [
          { name: 'Dust', tools: ['Duster', 'Microfiber Cloth', 'Dust Spray'] },
          { name: 'Wipe Down', tools: ['Microfiber Cloth', 'All-Purpose Cleaner'] },
          { name: 'Organize', tools: ['Storage Bins', 'Cleaning Cloth'] },
        ],
      },
      {
        name: 'Floor',
        actions: [
          { name: 'Vacuum', tools: ['Vacuum Cleaner', 'Vacuum Attachments'] },
          { name: 'Sweep', tools: ['Broom', 'Dust Pan'] },
          { name: 'Mop', tools: ['Mop', 'Bucket', 'Floor Cleaner'] },
        ],
      },
      {
        name: 'Nightstand',
        actions: [
          { name: 'Dust', tools: ['Duster', 'Microfiber Cloth'] },
          { name: 'Wipe Down', tools: ['Microfiber Cloth', 'All-Purpose Cleaner'] },
          { name: 'Organize', tools: ['Storage Container', 'Cleaning Cloth'] },
        ],
      },
    ],
  },

  // LIVING ROOM
  'living_room': {
    name: 'Living Room',
    targets: [
      {
        name: 'Coffee Table',
        actions: [
          { name: 'Dust', tools: ['Duster', 'Microfiber Cloth'] },
          { name: 'Wipe Down', tools: ['Microfiber Cloth', 'All-Purpose Cleaner'] },
          { name: 'Polish', tools: ['Polish', 'Microfiber Cloth'] },
        ],
      },
      {
        name: 'TV',
        actions: [
          { name: 'Dust Screen', tools: ['Microfiber Cloth', 'Screen Cleaner'] },
          { name: 'Clean Stand', tools: ['Microfiber Cloth', 'All-Purpose Cleaner'] },
        ],
      },
      {
        name: 'Couch',
        actions: [
          { name: 'Vacuum', tools: ['Vacuum Cleaner', 'Upholstery Attachment'] },
          { name: 'Spot Clean', tools: ['Upholstery Cleaner', 'Microfiber Cloth', 'Brush'] },
          { name: 'Fluff Pillows', tools: [] },
        ],
      },
      {
        name: 'Floor',
        actions: [
          { name: 'Vacuum', tools: ['Vacuum Cleaner'] },
          { name: 'Sweep', tools: ['Broom', 'Dust Pan'] },
          { name: 'Mop', tools: ['Mop', 'Bucket', 'Floor Cleaner'] },
        ],
      },
    ],
  },

  // OFFICE
  'office': {
    name: 'Office',
    targets: [
      {
        name: 'Desk',
        actions: [
          { name: 'Dust', tools: ['Duster', 'Microfiber Cloth'] },
          { name: 'Wipe Down', tools: ['Microfiber Cloth', 'All-Purpose Cleaner'] },
          { name: 'Organize', tools: ['Storage Organizers', 'Cleaning Cloth'] },
        ],
      },
      {
        name: 'Computer',
        actions: [
          { name: 'Dust Screen', tools: ['Microfiber Cloth', 'Screen Cleaner'] },
          { name: 'Clean Keyboard', tools: ['Compressed Air', 'Microfiber Cloth', 'Disinfectant Wipes'] },
        ],
      },
      {
        name: 'Floor',
        actions: [
          { name: 'Vacuum', tools: ['Vacuum Cleaner'] },
          { name: 'Sweep', tools: ['Broom', 'Dust Pan'] },
        ],
      },
    ],
  },
};

/**
 * Get valid rooms
 */
export function getValidRooms(): string[] {
  return Object.keys(ACTION_MAP);
}

/**
 * Get valid targets for a room
 */
export function getValidTargets(roomName: string): TargetDefinition[] {
  const normalizedRoom = roomName.toLowerCase().replace(/\s+/g, '_');
  return ACTION_MAP[normalizedRoom]?.targets || [];
}

/**
 * Get valid actions for a room + target combination
 */
export function getValidActions(roomName: string, targetName: string): ActionDefinition[] {
  const normalizedRoom = roomName.toLowerCase().replace(/\s+/g, '_');
  const normalizedTarget = targetName.toLowerCase().replace(/\s+/g, '_');
  
  const room = ACTION_MAP[normalizedRoom];
  if (!room) return [];
  
  const target = room.targets.find(
    t => t.name.toLowerCase().replace(/\s+/g, '_') === normalizedTarget
  );
  
  return target?.actions || [];
}

/**
 * Get tools for a specific action in a room + target context
 */
export function getToolsForActionContext(
  roomName: string,
  targetName: string,
  actionName: string
): string[] {
  const actions = getValidActions(roomName, targetName);
  const action = actions.find(
    a => a.name.toLowerCase() === actionName.toLowerCase()
  );
  
  return action?.tools || [];
}


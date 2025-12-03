/**
 * LOCATION BUILDER TEMPLATES
 * Pre-built room, target, and action templates for quick setup
 */

export interface ActionTemplate {
  name: string;
  defaultDurationMinutes: number;
  toolsRequired?: string[];
  instructions?: string;
}

export interface TargetTemplate {
  name: string;
  icon: string;
  defaultActions: ActionTemplate[];
}

export interface RoomTemplate {
  type: string;
  name: string;
  icon: string;
  defaultTargets: TargetTemplate[];
}

// ============================================
// ACTION TEMPLATES
// ============================================

export const COMMON_ACTIONS: Record<string, ActionTemplate> = {
  wipe: {
    name: 'Wipe Down',
    defaultDurationMinutes: 3,
    toolsRequired: ['Microfiber cloth', 'All-purpose cleaner'],
  },
  sanitize: {
    name: 'Sanitize',
    defaultDurationMinutes: 2,
    toolsRequired: ['Disinfectant spray'],
  },
  scrub: {
    name: 'Scrub',
    defaultDurationMinutes: 5,
    toolsRequired: ['Scrub brush', 'Cleaning solution'],
  },
  vacuum: {
    name: 'Vacuum',
    defaultDurationMinutes: 5,
    toolsRequired: ['Vacuum cleaner'],
  },
  mop: {
    name: 'Mop',
    defaultDurationMinutes: 7,
    toolsRequired: ['Mop', 'Floor cleaner'],
  },
  dust: {
    name: 'Dust',
    defaultDurationMinutes: 3,
    toolsRequired: ['Duster', 'Microfiber cloth'],
  },
  polish: {
    name: 'Polish',
    defaultDurationMinutes: 5,
    toolsRequired: ['Polish', 'Soft cloth'],
  },
  organize: {
    name: 'Organize',
    defaultDurationMinutes: 5,
    toolsRequired: [],
  },
  emptyTrash: {
    name: 'Empty Trash',
    defaultDurationMinutes: 2,
    toolsRequired: ['Trash bags'],
  },
  makebed: {
    name: 'Make Bed',
    defaultDurationMinutes: 5,
    toolsRequired: ['Fresh linens'],
  },
  cleanGlass: {
    name: 'Clean Glass',
    defaultDurationMinutes: 3,
    toolsRequired: ['Glass cleaner', 'Microfiber cloth'],
  },
  deepClean: {
    name: 'Deep Clean',
    defaultDurationMinutes: 15,
    toolsRequired: ['Specialized cleaning supplies'],
  },
};

// ============================================
// TARGET TEMPLATES
// ============================================

export const TARGET_TEMPLATES: Record<string, TargetTemplate> = {
  // Kitchen targets
  counter: {
    name: 'Counter',
    icon: '🔲',
    defaultActions: [COMMON_ACTIONS.wipe, COMMON_ACTIONS.sanitize],
  },
  stove: {
    name: 'Stove/Cooktop',
    icon: '🔥',
    defaultActions: [COMMON_ACTIONS.wipe, COMMON_ACTIONS.scrub, COMMON_ACTIONS.deepClean],
  },
  sink: {
    name: 'Sink',
    icon: '🚰',
    defaultActions: [COMMON_ACTIONS.scrub, COMMON_ACTIONS.sanitize],
  },
  refrigerator: {
    name: 'Refrigerator',
    icon: '🧊',
    defaultActions: [COMMON_ACTIONS.wipe, COMMON_ACTIONS.organize],
  },
  microwave: {
    name: 'Microwave',
    icon: '📦',
    defaultActions: [COMMON_ACTIONS.wipe, COMMON_ACTIONS.sanitize],
  },
  dishwasher: {
    name: 'Dishwasher',
    icon: '🍽️',
    defaultActions: [COMMON_ACTIONS.wipe, COMMON_ACTIONS.organize],
  },
  cabinets: {
    name: 'Cabinets',
    icon: '🗄️',
    defaultActions: [COMMON_ACTIONS.wipe, COMMON_ACTIONS.organize],
  },
  kitchenFloor: {
    name: 'Floor',
    icon: '⬜',
    defaultActions: [COMMON_ACTIONS.vacuum, COMMON_ACTIONS.mop],
  },

  // Bathroom targets
  toilet: {
    name: 'Toilet',
    icon: '🚽',
    defaultActions: [COMMON_ACTIONS.scrub, COMMON_ACTIONS.sanitize],
  },
  shower: {
    name: 'Shower/Tub',
    icon: '🚿',
    defaultActions: [COMMON_ACTIONS.scrub, COMMON_ACTIONS.sanitize, COMMON_ACTIONS.cleanGlass],
  },
  bathroomSink: {
    name: 'Sink & Vanity',
    icon: '🪥',
    defaultActions: [COMMON_ACTIONS.wipe, COMMON_ACTIONS.sanitize],
  },
  mirror: {
    name: 'Mirror',
    icon: '🪞',
    defaultActions: [COMMON_ACTIONS.cleanGlass],
  },
  bathroomFloor: {
    name: 'Floor',
    icon: '⬜',
    defaultActions: [COMMON_ACTIONS.vacuum, COMMON_ACTIONS.mop],
  },

  // Bedroom targets
  bed: {
    name: 'Bed',
    icon: '🛏️',
    defaultActions: [COMMON_ACTIONS.makebed, COMMON_ACTIONS.dust],
  },
  nightstand: {
    name: 'Nightstand',
    icon: '🛋️',
    defaultActions: [COMMON_ACTIONS.dust, COMMON_ACTIONS.wipe],
  },
  dresser: {
    name: 'Dresser',
    icon: '🗄️',
    defaultActions: [COMMON_ACTIONS.dust, COMMON_ACTIONS.organize],
  },
  closet: {
    name: 'Closet',
    icon: '🚪',
    defaultActions: [COMMON_ACTIONS.organize, COMMON_ACTIONS.vacuum],
  },
  bedroomFloor: {
    name: 'Floor',
    icon: '⬜',
    defaultActions: [COMMON_ACTIONS.vacuum],
  },
  windows: {
    name: 'Windows',
    icon: '🪟',
    defaultActions: [COMMON_ACTIONS.cleanGlass, COMMON_ACTIONS.dust],
  },

  // Living room targets
  couch: {
    name: 'Couch/Sofa',
    icon: '🛋️',
    defaultActions: [COMMON_ACTIONS.vacuum, COMMON_ACTIONS.dust],
  },
  coffeeTable: {
    name: 'Coffee Table',
    icon: '🪑',
    defaultActions: [COMMON_ACTIONS.dust, COMMON_ACTIONS.polish],
  },
  tvArea: {
    name: 'TV & Entertainment',
    icon: '📺',
    defaultActions: [COMMON_ACTIONS.dust, COMMON_ACTIONS.wipe],
  },
  shelves: {
    name: 'Shelves',
    icon: '📚',
    defaultActions: [COMMON_ACTIONS.dust, COMMON_ACTIONS.organize],
  },
  livingFloor: {
    name: 'Floor',
    icon: '⬜',
    defaultActions: [COMMON_ACTIONS.vacuum],
  },

  // Office targets
  desk: {
    name: 'Desk',
    icon: '🖥️',
    defaultActions: [COMMON_ACTIONS.wipe, COMMON_ACTIONS.organize],
  },
  chair: {
    name: 'Chair',
    icon: '🪑',
    defaultActions: [COMMON_ACTIONS.wipe, COMMON_ACTIONS.vacuum],
  },
  officeFloor: {
    name: 'Floor',
    icon: '⬜',
    defaultActions: [COMMON_ACTIONS.vacuum],
  },

  // Laundry targets
  washer: {
    name: 'Washer',
    icon: '🧺',
    defaultActions: [COMMON_ACTIONS.wipe],
  },
  dryer: {
    name: 'Dryer',
    icon: '🌀',
    defaultActions: [COMMON_ACTIONS.wipe, COMMON_ACTIONS.deepClean],
  },
  laundryFloor: {
    name: 'Floor',
    icon: '⬜',
    defaultActions: [COMMON_ACTIONS.vacuum, COMMON_ACTIONS.mop],
  },

  // Dining targets
  diningTable: {
    name: 'Dining Table',
    icon: '🍽️',
    defaultActions: [COMMON_ACTIONS.wipe, COMMON_ACTIONS.polish],
  },
  diningChairs: {
    name: 'Chairs',
    icon: '🪑',
    defaultActions: [COMMON_ACTIONS.wipe, COMMON_ACTIONS.vacuum],
  },
  diningFloor: {
    name: 'Floor',
    icon: '⬜',
    defaultActions: [COMMON_ACTIONS.vacuum, COMMON_ACTIONS.mop],
  },

  // Entry/Hallway
  entryFloor: {
    name: 'Floor',
    icon: '⬜',
    defaultActions: [COMMON_ACTIONS.vacuum, COMMON_ACTIONS.mop],
  },
  doorMat: {
    name: 'Door Mat',
    icon: '🚪',
    defaultActions: [COMMON_ACTIONS.vacuum],
  },
  coatRack: {
    name: 'Coat Rack/Hooks',
    icon: '🧥',
    defaultActions: [COMMON_ACTIONS.dust, COMMON_ACTIONS.organize],
  },

  // General
  trash: {
    name: 'Trash Bin',
    icon: '🗑️',
    defaultActions: [COMMON_ACTIONS.emptyTrash, COMMON_ACTIONS.sanitize],
  },
  lightFixtures: {
    name: 'Light Fixtures',
    icon: '💡',
    defaultActions: [COMMON_ACTIONS.dust],
  },
  airVents: {
    name: 'Air Vents',
    icon: '🌬️',
    defaultActions: [COMMON_ACTIONS.dust, COMMON_ACTIONS.vacuum],
  },
};

// ============================================
// ROOM TEMPLATES
// ============================================

export const ROOM_TEMPLATES: RoomTemplate[] = [
  {
    type: 'kitchen',
    name: 'Kitchen',
    icon: '🍳',
    defaultTargets: [
      TARGET_TEMPLATES.counter,
      TARGET_TEMPLATES.stove,
      TARGET_TEMPLATES.sink,
      TARGET_TEMPLATES.refrigerator,
      TARGET_TEMPLATES.microwave,
      TARGET_TEMPLATES.cabinets,
      TARGET_TEMPLATES.kitchenFloor,
      TARGET_TEMPLATES.trash,
    ],
  },
  {
    type: 'bathroom',
    name: 'Bathroom',
    icon: '🚿',
    defaultTargets: [
      TARGET_TEMPLATES.toilet,
      TARGET_TEMPLATES.shower,
      TARGET_TEMPLATES.bathroomSink,
      TARGET_TEMPLATES.mirror,
      TARGET_TEMPLATES.bathroomFloor,
      TARGET_TEMPLATES.trash,
    ],
  },
  {
    type: 'bedroom',
    name: 'Bedroom',
    icon: '🛏️',
    defaultTargets: [
      TARGET_TEMPLATES.bed,
      TARGET_TEMPLATES.nightstand,
      TARGET_TEMPLATES.dresser,
      TARGET_TEMPLATES.closet,
      TARGET_TEMPLATES.bedroomFloor,
      TARGET_TEMPLATES.windows,
      TARGET_TEMPLATES.trash,
    ],
  },
  {
    type: 'living_room',
    name: 'Living Room',
    icon: '🛋️',
    defaultTargets: [
      TARGET_TEMPLATES.couch,
      TARGET_TEMPLATES.coffeeTable,
      TARGET_TEMPLATES.tvArea,
      TARGET_TEMPLATES.shelves,
      TARGET_TEMPLATES.livingFloor,
      TARGET_TEMPLATES.windows,
    ],
  },
  {
    type: 'dining_room',
    name: 'Dining Room',
    icon: '🍽️',
    defaultTargets: [
      TARGET_TEMPLATES.diningTable,
      TARGET_TEMPLATES.diningChairs,
      TARGET_TEMPLATES.diningFloor,
    ],
  },
  {
    type: 'office',
    name: 'Office',
    icon: '📚',
    defaultTargets: [
      TARGET_TEMPLATES.desk,
      TARGET_TEMPLATES.chair,
      TARGET_TEMPLATES.shelves,
      TARGET_TEMPLATES.officeFloor,
      TARGET_TEMPLATES.windows,
      TARGET_TEMPLATES.trash,
    ],
  },
  {
    type: 'laundry',
    name: 'Laundry Room',
    icon: '🧺',
    defaultTargets: [
      TARGET_TEMPLATES.washer,
      TARGET_TEMPLATES.dryer,
      TARGET_TEMPLATES.laundryFloor,
    ],
  },
  {
    type: 'entry',
    name: 'Entry/Hallway',
    icon: '🚪',
    defaultTargets: [
      TARGET_TEMPLATES.entryFloor,
      TARGET_TEMPLATES.doorMat,
      TARGET_TEMPLATES.coatRack,
    ],
  },
  {
    type: 'garage',
    name: 'Garage',
    icon: '🚗',
    defaultTargets: [
      { name: 'Floor', icon: '⬜', defaultActions: [COMMON_ACTIONS.vacuum] },
      { name: 'Workbench', icon: '🔧', defaultActions: [COMMON_ACTIONS.wipe, COMMON_ACTIONS.organize] },
    ],
  },
  {
    type: 'patio',
    name: 'Patio/Deck',
    icon: '🌿',
    defaultTargets: [
      { name: 'Outdoor Furniture', icon: '🪑', defaultActions: [COMMON_ACTIONS.wipe] },
      { name: 'Floor/Surface', icon: '⬜', defaultActions: [COMMON_ACTIONS.vacuum] },
    ],
  },
];

// Helper to get room template by type
export function getRoomTemplate(type: string): RoomTemplate | undefined {
  return ROOM_TEMPLATES.find(r => r.type === type);
}

// Helper to get all target templates as array
export function getAllTargetTemplates(): TargetTemplate[] {
  return Object.values(TARGET_TEMPLATES);
}


/**
 * Label Filtering for Video Intelligence
 * Filters Google's raw labels to only include cleaning/property-relevant items.
 */

export const ALLOWED_OBJECT_CATEGORIES = new Set([
  // Furniture
  'bed', 'sofa', 'couch', 'chair', 'table', 'desk', 'nightstand', 'dresser',
  'cabinet', 'shelf', 'bookshelf', 'coffee table', 'dining table', 'ottoman',
  'bench', 'stool', 'wardrobe', 'closet', 'drawer',
  
  // Kitchen items
  'refrigerator', 'stove', 'oven', 'microwave', 'dishwasher', 'sink',
  'countertop', 'plate', 'bowl', 'cup', 'glass', 'mug',
  'pot', 'pan', 'cookware', 'tableware', 'utensil', 'knife', 'fork', 'spoon',
  'cutting board', 'blender', 'toaster', 'coffee maker', 'kettle',
  'food', 'fruit', 'vegetable', 'bottle', 'jar', 'container',
  'packaged goods', 'bagged packaged goods', 'bottled and jarred packaged goods',
  'dish rack', 'sponge', 'dish soap',
  
  // Bathroom items
  'toilet', 'bathtub', 'shower', 'mirror', 'towel', 'soap', 'shampoo',
  'toothbrush', 'faucet', 'toilet paper', 'bath mat', 'shower curtain',
  
  // Bedroom items
  'pillow', 'blanket', 'mattress', 'sheet', 'comforter', 'lamp',
  'alarm clock', 'curtain', 'blind',
  
  // Living room items
  'television', 'tv', 'remote control', 'rug', 'carpet', 'fireplace',
  'plant', 'vase', 'picture frame', 'artwork', 'clock',
  
  // Cleaning supplies
  'vacuum', 'mop', 'broom', 'bucket', 'spray bottle', 'cleaning product',
  'trash can', 'garbage bag', 'recycling bin', 'dustpan',
  'paper towel', 'cleaning cloth', 'gloves',
  
  // Laundry
  'washing machine', 'dryer', 'iron', 'ironing board', 'laundry basket',
  'clothes', 'clothing', 'shirt', 'pants', 'towel',
  
  // General household
  'door', 'window', 'floor', 'wall', 'ceiling', 'light', 'switch',
  'outlet', 'vent', 'fan', 'air conditioner', 'heater',
  
  // Storage
  'box', 'basket', 'bin', 'container', 'bag', 'hanger',
  
  // Context
  'person', 'hand', 'arm',
]);

export const ALLOWED_PARTIAL_MATCHES = [
  'clean', 'wash', 'wipe', 'scrub', 'mop', 'vacuum', 'dust',
  'kitchen', 'bathroom', 'bedroom', 'living', 'dining', 'laundry',
  'furniture', 'appliance', 'fixture', 'floor', 'counter', 'surface',
];

export const BLOCKED_LABELS = new Set([
  'wheel', 'tire', 'vehicle', 'car', 'truck', 'motorcycle', 'bicycle',
  'grooming trimmer', 'trimmer', 'razor',
  'weapon', 'gun',
  'animal', 'dog', 'cat', 'bird', 'fish',
  'sports equipment', 'ball', 'bat', 'racket',
  'musical instrument', 'guitar', 'piano', 'drum',
  'toy', 'game', 'puzzle',
  'jewelry', 'watch', 'ring', 'necklace',
  'makeup', 'cosmetics',
  'medicine', 'pill', 'medication',
  'money', 'cash', 'credit card',
]);

export function filterRelevantLabels(labels: string[]): string[] {
  return labels.filter(label => {
    const lower = label.toLowerCase();
    
    // Check blocked list
    if (BLOCKED_LABELS.has(lower)) return false;
    for (const blocked of BLOCKED_LABELS) {
      if (lower.includes(blocked) || blocked.includes(lower)) return false;
    }
    
    // Check allowed exact match
    if (ALLOWED_OBJECT_CATEGORIES.has(lower)) return true;
    
    // Check allowed partial match
    for (const allowed of ALLOWED_OBJECT_CATEGORIES) {
      if (lower.includes(allowed) || allowed.includes(lower)) return true;
    }
    
    // Check allowed keywords
    for (const partial of ALLOWED_PARTIAL_MATCHES) {
      if (lower.includes(partial)) return true;
    }
    
    return false;
  });
}


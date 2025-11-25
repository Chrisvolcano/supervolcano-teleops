// ============= ROOM → TARGET MAPPING =============
export const ROOM_TARGET_MAP: Record<string, string[]> = {
  kitchen: ['sink', 'countertop', 'stove', 'oven', 'dishwasher', 'refrigerator', 'cabinets', 'floor', 'backsplash', 'microwave', 'trash can', 'pantry', 'island'],
  bathroom: ['toilet', 'shower', 'bathtub', 'sink', 'mirror', 'floor', 'cabinets', 'tiles', 'exhaust fan', 'vanity', 'grout'],
  bedroom: ['bed', 'closet', 'floor', 'windows', 'walls', 'dresser', 'nightstand', 'ceiling fan', 'carpet', 'baseboards'],
  living_room: ['couch', 'floor', 'windows', 'walls', 'coffee table', 'entertainment center', 'curtains', 'carpet', 'fireplace', 'baseboards'],
  dining_room: ['table', 'chairs', 'floor', 'windows', 'chandelier', 'buffet', 'carpet', 'walls', 'baseboards'],
  laundry_room: ['washer', 'dryer', 'sink', 'floor', 'cabinets', 'countertop', 'vents', 'ironing board'],
  garage: ['floor', 'walls', 'workbench', 'shelving', 'garage door', 'driveway', 'storage', 'ceiling'],
  yard: ['lawn', 'garden', 'patio', 'deck', 'fence', 'driveway', 'sprinklers', 'shed', 'pool', 'walkway', 'bushes', 'trees'],
  basement: ['floor', 'walls', 'storage', 'sump pump', 'furnace', 'water heater', 'stairs', 'ceiling'],
  office: ['desk', 'floor', 'windows', 'walls', 'shelving', 'cabinets', 'equipment', 'carpet'],
  hallway: ['floor', 'walls', 'baseboards', 'ceiling', 'light fixtures'],
  entryway: ['floor', 'walls', 'door', 'mat', 'closet']
};

// ============= ROOM + TARGET → ACTION MAPPING =============
export const ACTION_MAP: Record<string, Record<string, string[]>> = {
  kitchen: {
    sink: ['wash', 'scrub', 'unclog', 'sanitize', 'polish', 'repair leak', 'clean drain'],
    countertop: ['wipe down', 'disinfect', 'declutter', 'organize', 'deep clean', 'polish'],
    stove: ['clean', 'degrease', 'replace burner', 'wipe down', 'deep clean', 'scrub'],
    oven: ['clean', 'degrease', 'self-clean cycle', 'scrub', 'replace element'],
    floor: ['sweep', 'mop', 'vacuum', 'scrub', 'spot clean'],
    dishwasher: ['clean filter', 'run cycle', 'descale', 'load', 'unload', 'wipe down'],
    refrigerator: ['clean', 'organize', 'defrost', 'wipe down', 'restock', 'deep clean'],
    cabinets: ['organize', 'clean', 'declutter', 'wipe down', 'dust'],
    'trash can': ['empty', 'clean', 'replace bag', 'sanitize'],
    backsplash: ['clean', 'scrub', 'degrease', 'polish', 'wipe down'],
    microwave: ['clean', 'sanitize', 'degrease', 'wipe down'],
    pantry: ['organize', 'declutter', 'clean', 'restock', 'dust'],
    island: ['wipe down', 'clean', 'organize', 'disinfect']
  },
  bathroom: {
    toilet: ['clean', 'scrub', 'unclog', 'sanitize', 'disinfect', 'replace parts'],
    shower: ['clean', 'scrub', 'descale', 'recaulk', 'replace head', 'unclog drain', 'squeegee', 'disinfect'],
    bathtub: ['clean', 'scrub', 'descale', 'unclog drain', 'recaulk', 'disinfect'],
    sink: ['clean', 'scrub', 'unclog', 'polish fixtures', 'disinfect', 'sanitize'],
    mirror: ['clean', 'polish', 'wipe down', 'defog'],
    floor: ['sweep', 'mop', 'scrub', 'disinfect', 'vacuum'],
    tiles: ['clean', 'scrub', 'regrout', 'reseal', 'polish', 'disinfect'],
    cabinets: ['clean', 'organize', 'declutter', 'wipe down'],
    'exhaust fan': ['clean', 'dust', 'replace filter'],
    vanity: ['clean', 'organize', 'declutter', 'wipe down', 'disinfect'],
    grout: ['clean', 'scrub', 'reseal', 'whiten']
  },
  bedroom: {
    bed: ['make bed', 'change sheets', 'flip mattress', 'vacuum under', 'organize'],
    floor: ['vacuum', 'sweep', 'mop', 'shampoo carpet', 'spot clean'],
    closet: ['organize', 'declutter', 'dust', 'vacuum', 'hang clothes', 'fold clothes'],
    windows: ['clean', 'wash', 'dust blinds', 'vacuum sills', 'wipe frames'],
    dresser: ['organize', 'dust', 'declutter', 'polish', 'wipe down'],
    walls: ['dust', 'wipe down', 'spot clean', 'touch up paint'],
    nightstand: ['organize', 'dust', 'declutter', 'wipe down'],
    'ceiling fan': ['dust', 'clean blades', 'wipe down'],
    carpet: ['vacuum', 'shampoo', 'spot clean', 'deodorize', 'steam clean'],
    baseboards: ['dust', 'wipe down', 'clean', 'vacuum']
  },
  living_room: {
    couch: ['vacuum', 'spot clean', 'fluff cushions', 'organize', 'shampoo', 'rotate cushions'],
    floor: ['vacuum', 'sweep', 'mop', 'shampoo carpet', 'spot clean'],
    windows: ['clean', 'wash', 'dust blinds', 'vacuum sills', 'wipe frames'],
    walls: ['dust', 'wipe down', 'spot clean'],
    'coffee table': ['dust', 'polish', 'organize', 'wipe down'],
    'entertainment center': ['dust', 'organize cables', 'clean screen', 'wipe down'],
    curtains: ['vacuum', 'dust', 'steam clean', 'wash'],
    carpet: ['vacuum', 'shampoo', 'spot clean', 'deodorize', 'steam clean'],
    fireplace: ['clean', 'sweep', 'remove ash', 'dust mantle'],
    baseboards: ['dust', 'wipe down', 'clean', 'vacuum']
  },
  dining_room: {
    table: ['wipe down', 'polish', 'clean', 'set', 'clear', 'dust'],
    chairs: ['wipe down', 'vacuum', 'spot clean', 'dust'],
    floor: ['vacuum', 'sweep', 'mop', 'spot clean'],
    windows: ['clean', 'wash', 'dust blinds', 'vacuum sills'],
    chandelier: ['dust', 'clean', 'polish', 'replace bulbs'],
    buffet: ['dust', 'polish', 'organize', 'wipe down'],
    carpet: ['vacuum', 'spot clean', 'shampoo', 'steam clean'],
    walls: ['dust', 'wipe down', 'spot clean'],
    baseboards: ['dust', 'wipe down', 'clean', 'vacuum']
  },
  laundry_room: {
    washer: ['clean', 'run cycle', 'descale', 'clean filter', 'wipe down'],
    dryer: ['clean lint trap', 'run cycle', 'clean vent', 'wipe down'],
    sink: ['clean', 'scrub', 'unclog', 'sanitize'],
    floor: ['sweep', 'mop', 'vacuum'],
    cabinets: ['organize', 'clean', 'declutter', 'wipe down'],
    countertop: ['wipe down', 'organize', 'clean'],
    vents: ['clean', 'dust', 'vacuum'],
    'ironing board': ['set up', 'put away', 'clean', 'iron clothes']
  },
  garage: {
    floor: ['sweep', 'mop', 'power wash', 'organize', 'remove oil stains'],
    walls: ['dust', 'wipe down', 'organize hooks', 'sweep cobwebs'],
    workbench: ['organize', 'clean', 'declutter', 'wipe down'],
    shelving: ['organize', 'dust', 'declutter', 'clean'],
    'garage door': ['clean', 'lubricate', 'test safety features', 'wipe down'],
    driveway: ['sweep', 'power wash', 'remove stains', 'seal'],
    storage: ['organize', 'declutter', 'clean', 'label'],
    ceiling: ['dust', 'sweep cobwebs', 'clean']
  },
  yard: {
    lawn: ['mow', 'water', 'fertilize', 'weed', 'aerate', 'seed', 'edge', 'rake'],
    garden: ['weed', 'water', 'plant', 'prune', 'mulch', 'harvest', 'fertilize'],
    patio: ['sweep', 'wash', 'power wash', 'scrub', 'seal'],
    deck: ['sweep', 'wash', 'stain', 'seal', 'repair boards', 'power wash'],
    fence: ['paint', 'stain', 'repair', 'clean', 'replace boards', 'power wash'],
    driveway: ['sweep', 'power wash', 'seal', 'remove stains'],
    sprinklers: ['test', 'adjust', 'repair', 'winterize'],
    shed: ['organize', 'clean', 'repair', 'declutter'],
    pool: ['clean', 'vacuum', 'skim', 'test chemicals', 'backwash filter', 'brush walls'],
    walkway: ['sweep', 'power wash', 'weed', 'seal'],
    bushes: ['trim', 'prune', 'water', 'fertilize', 'shape'],
    trees: ['prune', 'water', 'fertilize', 'remove dead branches', 'trim']
  },
  basement: {
    floor: ['sweep', 'mop', 'vacuum', 'spot clean'],
    walls: ['dust', 'wipe down', 'check for moisture'],
    storage: ['organize', 'declutter', 'clean', 'label'],
    'sump pump': ['test', 'clean', 'inspect', 'maintain'],
    furnace: ['replace filter', 'dust', 'schedule maintenance'],
    'water heater': ['flush', 'inspect', 'check temperature'],
    stairs: ['sweep', 'vacuum', 'wipe down', 'clean handrail'],
    ceiling: ['dust', 'sweep cobwebs', 'clean']
  },
  office: {
    desk: ['organize', 'dust', 'wipe down', 'declutter', 'clean'],
    floor: ['vacuum', 'sweep', 'mop', 'spot clean'],
    windows: ['clean', 'wash', 'dust blinds', 'vacuum sills'],
    walls: ['dust', 'wipe down', 'spot clean'],
    shelving: ['organize', 'dust', 'declutter', 'clean'],
    cabinets: ['organize', 'clean', 'declutter', 'wipe down'],
    equipment: ['dust', 'clean', 'organize cables', 'wipe down'],
    carpet: ['vacuum', 'spot clean', 'shampoo', 'steam clean']
  },
  hallway: {
    floor: ['vacuum', 'sweep', 'mop', 'spot clean'],
    walls: ['dust', 'wipe down', 'spot clean'],
    baseboards: ['dust', 'wipe down', 'clean', 'vacuum'],
    ceiling: ['dust', 'sweep cobwebs'],
    'light fixtures': ['dust', 'clean', 'replace bulbs']
  },
  entryway: {
    floor: ['vacuum', 'sweep', 'mop', 'spot clean'],
    walls: ['dust', 'wipe down', 'spot clean'],
    door: ['clean', 'wipe down', 'polish hardware'],
    mat: ['shake out', 'vacuum', 'wash', 'replace'],
    closet: ['organize', 'declutter', 'dust', 'clean']
  }
};

// ============= ROOM + TARGET + ACTION → TOOL MAPPING =============
export const TOOL_MAP: Record<string, any> = {
  // Generic action-based tools (used across multiple contexts)
  _generic: {
    vacuum: ['vacuum cleaner', 'handheld vacuum', 'shop vac', 'cordless vacuum'],
    sweep: ['broom', 'dustpan', 'hand broom'],
    mop: ['mop', 'bucket', 'steam mop', 'spin mop', 'floor cleaner solution'],
    scrub: ['scrub brush', 'scouring pad', 'magic eraser', 'steel wool', 'cleaning spray'],
    dust: ['duster', 'microfiber cloth', 'damp cloth', 'dust spray'],
    'wipe down': ['microfiber cloth', 'all-purpose cleaner', 'paper towels', 'disinfecting wipes'],
    clean: ['all-purpose cleaner', 'microfiber cloth', 'spray bottle', 'cleaning gloves'],
    polish: ['furniture polish', 'polishing cloth', 'wood cleaner', 'stainless steel polish'],
    organize: ['storage bins', 'labels', 'baskets', 'organizers'],
    disinfect: ['disinfectant spray', 'bleach solution', 'disinfecting wipes', 'sanitizer']
  },

  // Kitchen-specific tools
  kitchen: {
    sink: {
      scrub: ['dish brush', 'scouring pad', 'Bar Keepers Friend', 'baking soda', 'dish soap'],
      sanitize: ['disinfectant spray', 'bleach solution', 'antibacterial cleaner'],
      unclog: ['plunger', 'drain snake', 'baking soda', 'vinegar', 'drain cleaner']
    },
    countertop: {
      disinfect: ['Lysol spray', 'Clorox wipes', 'disinfectant spray', 'microfiber cloth'],
      'wipe down': ['all-purpose cleaner', 'granite cleaner', 'microfiber cloth']
    },
    stove: {
      degrease: ['degreaser spray', 'baking soda paste', 'scrub brush', 'steel wool'],
      scrub: ['stovetop cleaner', 'scraper tool', 'scouring pad', 'degreaser']
    },
    oven: {
      clean: ['oven cleaner', 'baking soda paste', 'scrub brush', 'gloves', 'scraper'],
      degrease: ['oven degreaser', 'heavy-duty cleaner', 'steel wool']
    },
    dishwasher: {
      'clean filter': ['dish soap', 'small brush', 'warm water'],
      descale: ['dishwasher cleaner', 'vinegar', 'citric acid']
    },
    refrigerator: {
      clean: ['all-purpose cleaner', 'baking soda solution', 'microfiber cloth', 'vacuum'],
      organize: ['storage bins', 'lazy susan', 'shelf liners', 'labels']
    },
    floor: {
      mop: ['mop', 'floor cleaner', 'bucket', 'microfiber mop pad'],
      sweep: ['broom', 'dustpan', 'vacuum']
    },
    backsplash: {
      degrease: ['degreaser', 'magic eraser', 'scrub brush', 'all-purpose cleaner']
    }
  },

  // Bathroom-specific tools
  bathroom: {
    toilet: {
      clean: ['toilet brush', 'toilet bowl cleaner', 'disinfectant', 'rubber gloves'],
      scrub: ['toilet brush', 'Lysol toilet cleaner', 'pumice stone', 'bleach tablet'],
      sanitize: ['Clorox bleach', 'disinfectant spray', 'toilet bowl cleaner']
    },
    shower: {
      scrub: ['scrub brush', 'shower cleaner', 'magic eraser', 'grout brush'],
      descale: ['CLR cleaner', 'vinegar solution', 'lime remover', 'scrub brush'],
      squeegee: ['squeegee', 'microfiber cloth']
    },
    bathtub: {
      scrub: ['tub scrubber', 'Bar Keepers Friend', 'baking soda', 'soft scrub'],
      descale: ['CLR cleaner', 'vinegar', 'lime remover']
    },
    sink: {
      'polish fixtures': ['stainless steel cleaner', 'microfiber cloth', 'chrome polish'],
      scrub: ['soft scrub', 'baking soda', 'scouring pad']
    },
    mirror: {
      clean: ['Windex', 'glass cleaner', 'microfiber cloth', 'newspaper', 'vinegar solution']
    },
    tiles: {
      scrub: ['tile cleaner', 'grout brush', 'magic eraser', 'baking soda paste'],
      regrout: ['grout', 'grout float', 'sponge', 'grout sealer']
    },
    grout: {
      scrub: ['grout brush', 'grout cleaner', 'baking soda paste', 'hydrogen peroxide'],
      whiten: ['grout whitening pen', 'bleach solution', 'oxygenated cleaner']
    },
    floor: {
      mop: ['mop', 'disinfectant floor cleaner', 'bucket'],
      scrub: ['scrub brush', 'tile cleaner', 'grout brush']
    }
  },

  // Bedroom-specific tools
  bedroom: {
    bed: {
      'make bed': ['fresh sheets', 'pillowcases', 'duvet cover'],
      'change sheets': ['clean linens', 'mattress protector', 'pillows'],
      'vacuum under': ['vacuum cleaner', 'crevice tool', 'duster']
    },
    carpet: {
      vacuum: ['vacuum cleaner', 'upholstery attachment'],
      shampoo: ['carpet shampooer', 'carpet cleaning solution', 'spot cleaner'],
      'steam clean': ['steam cleaner', 'cleaning solution', 'vacuum']
    },
    closet: {
      organize: ['hangers', 'storage bins', 'shoe rack', 'shelf dividers'],
      'hang clothes': ['hangers', 'garment bags', 'cedar blocks']
    },
    windows: {
      clean: ['Windex', 'glass cleaner', 'squeegee', 'microfiber cloth', 'paper towels'],
      'dust blinds': ['duster', 'vacuum with brush attachment', 'microfiber cloth']
    },
    'ceiling fan': {
      dust: ['extendable duster', 'pillowcase method', 'step ladder', 'microfiber cloth']
    }
  },

  // Living room-specific tools
  living_room: {
    couch: {
      vacuum: ['upholstery attachment', 'vacuum cleaner', 'handheld vacuum'],
      'spot clean': ['upholstery cleaner', 'spot remover', 'microfiber cloth', 'soft brush'],
      shampoo: ['upholstery shampooer', 'fabric cleaner', 'soft brush']
    },
    carpet: {
      vacuum: ['vacuum cleaner', 'carpet attachment'],
      shampoo: ['carpet shampooer', 'carpet cleaning solution', 'spot cleaner'],
      'steam clean': ['steam cleaner', 'carpet cleaner solution']
    },
    windows: {
      clean: ['Windex', 'glass cleaner', 'squeegee', 'microfiber cloth'],
      'dust blinds': ['duster', 'vacuum brush attachment', 'microfiber cloth']
    },
    'entertainment center': {
      dust: ['microfiber cloth', 'duster', 'electronics duster'],
      'clean screen': ['screen cleaner', 'microfiber cloth', 'electronics wipes']
    },
    fireplace: {
      clean: ['fireplace brush', 'ash vacuum', 'shovel', 'bucket'],
      'remove ash': ['ash vacuum', 'metal bucket', 'shovel', 'gloves']
    }
  },

  // Garage-specific tools
  garage: {
    floor: {
      sweep: ['push broom', 'dustpan', 'shop vac'],
      'power wash': ['pressure washer', 'concrete cleaner', 'degreaser'],
      'remove oil stains': ['oil stain remover', 'degreaser', 'scrub brush', 'cat litter']
    },
    'garage door': {
      lubricate: ['garage door lubricant', 'WD-40', 'silicone spray']
    },
    workbench: {
      organize: ['tool organizers', 'pegboard', 'bins', 'labels']
    }
  },

  // Yard-specific tools
  yard: {
    lawn: {
      mow: ['lawn mower', 'gas/electric mower', 'safety glasses', 'ear protection'],
      edge: ['string trimmer', 'edger', 'safety glasses'],
      water: ['hose', 'sprinkler', 'watering can'],
      fertilize: ['fertilizer spreader', 'lawn fertilizer', 'gloves'],
      rake: ['rake', 'leaf bags', 'gloves'],
      weed: ['weed puller', 'garden gloves', 'weed killer spray']
    },
    garden: {
      weed: ['hand weeder', 'garden gloves', 'kneeling pad', 'hoe'],
      water: ['watering can', 'hose', 'soaker hose', 'drip irrigation'],
      prune: ['pruning shears', 'loppers', 'garden gloves'],
      mulch: ['mulch', 'wheelbarrow', 'rake', 'gloves']
    },
    patio: {
      'power wash': ['pressure washer', 'concrete cleaner', 'brush attachment'],
      sweep: ['push broom', 'leaf blower']
    },
    deck: {
      'power wash': ['pressure washer', 'deck cleaner', 'brush'],
      stain: ['deck stain', 'paintbrush', 'roller', 'paint tray'],
      seal: ['deck sealer', 'applicator', 'brush']
    },
    fence: {
      paint: ['exterior paint', 'paintbrush', 'roller', 'paint sprayer'],
      stain: ['fence stain', 'brush', 'sprayer', 'drop cloth'],
      'power wash': ['pressure washer', 'wood cleaner']
    },
    pool: {
      vacuum: ['pool vacuum', 'vacuum head', 'telescopic pole', 'vacuum hose'],
      skim: ['skimmer net', 'telescopic pole'],
      'test chemicals': ['pool test kit', 'test strips', 'pH meter'],
      'brush walls': ['pool brush', 'telescopic pole']
    },
    bushes: {
      trim: ['hedge trimmer', 'pruning shears', 'gloves', 'safety glasses'],
      prune: ['pruning shears', 'loppers', 'hand saw', 'gloves']
    },
    trees: {
      prune: ['pruning saw', 'loppers', 'pole pruner', 'safety gear'],
      trim: ['chainsaw', 'pole pruner', 'safety gear', 'ladder']
    }
  },

  // Laundry room-specific tools
  laundry_room: {
    washer: {
      clean: ['washing machine cleaner', 'vinegar', 'baking soda', 'microfiber cloth'],
      descale: ['descaling solution', 'vinegar', 'cleaning tablets']
    },
    dryer: {
      'clean lint trap': ['lint brush', 'vacuum crevice tool'],
      'clean vent': ['dryer vent brush', 'vacuum', 'screwdriver']
    },
    'ironing board': {
      'iron clothes': ['iron', 'ironing board', 'spray starch', 'pressing cloth']
    }
  },

  // Office-specific tools
  office: {
    desk: {
      organize: ['desk organizers', 'file folders', 'labels', 'drawer dividers'],
      dust: ['microfiber cloth', 'duster', 'electronics duster']
    },
    equipment: {
      dust: ['compressed air', 'microfiber cloth', 'electronics duster'],
      clean: ['electronics cleaner', 'screen wipes', 'keyboard cleaner']
    }
  }
};

// ============= HELPER FUNCTIONS =============

// Get valid targets for a room
export const getValidTargets = (room: string): string[] => {
  return ROOM_TARGET_MAP[room] || [];
};

// Get valid actions for a room+target combo
export const getValidActions = (room: string, target: string): string[] => {
  if (!room || !target) return [];
  
  // Normalize keys - convert to lowercase and replace spaces with underscores
  const roomKey = room.toLowerCase().trim().replace(/\s+/g, '_');
  const targetKey = target.toLowerCase().trim().replace(/\s+/g, '_');
  
  console.log('getValidActions lookup:', { roomKey, targetKey, originalRoom: room, originalTarget: target });
  
  // Try exact match first
  let actions = ACTION_MAP[roomKey]?.[targetKey];
  
  // If no exact match, try case-insensitive matching
  if (!actions || actions.length === 0) {
    // Find matching room key (case-insensitive)
    const matchingRoomKey = Object.keys(ACTION_MAP).find(
      key => key.toLowerCase() === roomKey
    );
    
    if (matchingRoomKey) {
      const roomTargets = ACTION_MAP[matchingRoomKey];
      // Find matching target key (case-insensitive, handle spaces/underscores)
      const matchingTargetKey = Object.keys(roomTargets).find(
        key => {
          const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
          return normalizedKey === targetKey || key.toLowerCase() === targetKey;
        }
      );
      
      if (matchingTargetKey) {
        actions = roomTargets[matchingTargetKey];
      }
    }
  }
  
  console.log('Found actions:', actions);
  return actions || [];
};

// Get valid tools for a room+target+action combo
export const getValidTools = (room: string, target: string, action: string): string[] => {
  // First, check for specific room+target+action combination
  const specificTools = TOOL_MAP[room]?.[target]?.[action];
  if (specificTools && specificTools.length > 0) {
    return specificTools;
  }

  // Finally, fall back to generic action-based tools
  const genericTools = TOOL_MAP._generic?.[action];
  if (genericTools && genericTools.length > 0) {
    return genericTools;
  }

  return [];
};

// Format display text (convert snake_case to Title Case)
export const formatDisplayText = (text: string): string => {
  return text
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
};


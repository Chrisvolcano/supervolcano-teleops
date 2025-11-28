/**
 * Tool Presets - Maps action types to recommended tools
 * Used to intelligently suggest tools based on selected action
 */

export const TOOL_PRESETS: Record<string, string[]> = {
  // Sweeping actions
  'sweep': ['Broom', 'Dust Pan', 'Vacuum'],
  'vacuum': ['Vacuum Cleaner', 'Vacuum Attachments', 'Extension Cord'],
  
  // Mopping actions
  'mop': ['Mop', 'Bucket', 'Floor Cleaner', 'Mop Bucket'],
  'wet_mop': ['Wet Mop', 'Mop Bucket', 'Floor Cleaner'],
  'dry_mop': ['Dry Mop', 'Microfiber Mop Pad'],
  
  // Wiping/Dusting actions
  'wipe': ['Microfiber Cloth', 'All-Purpose Cleaner', 'Paper Towels'],
  'wipe_down': ['Microfiber Cloth', 'All-Purpose Cleaner', 'Disinfectant Wipes'],
  'dust': ['Duster', 'Microfiber Cloth', 'Dust Spray'],
  'polish': ['Polish', 'Microfiber Cloth', 'Polishing Pad'],
  
  // Cleaning specific surfaces
  'clean_glass': ['Glass Cleaner', 'Microfiber Cloth', 'Squeegee', 'Paper Towels'],
  'clean_mirror': ['Glass Cleaner', 'Microfiber Cloth', 'Paper Towels'],
  'clean_window': ['Glass Cleaner', 'Squeegee', 'Microfiber Cloth', 'Window Cleaner'],
  
  // Bathroom specific
  'scrub': ['Scrub Brush', 'Cleaning Solution', 'Gloves', 'Sponge'],
  'sanitize': ['Disinfectant', 'Microfiber Cloth', 'Gloves', 'Sanitizing Spray'],
  'disinfect': ['Disinfectant', 'Paper Towels', 'Gloves', 'Spray Bottle'],
  'clean_toilet': ['Toilet Brush', 'Toilet Cleaner', 'Gloves', 'Disinfectant'],
  'clean_shower': ['Scrub Brush', 'Shower Cleaner', 'Gloves', 'Sponge'],
  
  // Kitchen specific
  'wash': ['Dish Soap', 'Sponge', 'Gloves', 'Scrub Brush'],
  'wash_dishes': ['Dish Soap', 'Sponge', 'Dish Towel', 'Scrub Brush'],
  'clean_stove': ['Stove Cleaner', 'Scrub Pad', 'Microfiber Cloth', 'Gloves'],
  'clean_oven': ['Oven Cleaner', 'Scrub Pad', 'Gloves', 'Paper Towels'],
  'clean_counters': ['All-Purpose Cleaner', 'Microfiber Cloth', 'Disinfectant'],
  
  // Trash/Organization
  'empty_trash': ['Trash Bags', 'Gloves'],
  'replace_bags': ['Trash Bags', 'Gloves'],
  'organize': ['Storage Bins', 'Labels', 'Cleaning Cloth'],
  
  // Bed making
  'make_bed': ['Fresh Linens'],
  'change_sheets': ['Fresh Sheets', 'Laundry Bag'],
  
  // Default for any action without specific tools
  'default': ['Microfiber Cloth', 'All-Purpose Cleaner', 'Gloves'],
};

/**
 * Get tools for an action name
 * @param actionName - The action name (e.g., "Sweep", "Mop", "Wipe Down")
 * @returns Array of recommended tools
 */
export function getToolsForAction(actionName: string): string[] {
  if (!actionName) {
    return TOOL_PRESETS.default;
  }
  
  const normalizedAction = actionName.toLowerCase().replace(/\s+/g, '_');
  
  // Try exact match first
  if (TOOL_PRESETS[normalizedAction]) {
    return TOOL_PRESETS[normalizedAction];
  }
  
  // Try partial match
  for (const [key, tools] of Object.entries(TOOL_PRESETS)) {
    if (normalizedAction.includes(key) || key.includes(normalizedAction)) {
      return tools;
    }
  }
  
  // Return default tools
  return TOOL_PRESETS.default;
}


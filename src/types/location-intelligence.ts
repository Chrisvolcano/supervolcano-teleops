/**
 * LOCATION INTELLIGENCE TYPES
 * Hyper-local operational data for address-specific cleaning intelligence
 */

// ============================================
// ACCESS INFORMATION
// ============================================

export type EntryMethod = 'key' | 'code' | 'lockbox' | 'smart_lock' | 'other';

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface AccessInfo {
  entryMethod?: EntryMethod;
  entryDetails?: string;
  alarmCode?: string;
  alarmLocation?: string;
  wifiNetwork?: string;
  wifiPassword?: string;
  emergencyContact?: EmergencyContact;
  parkingInstructions?: string;
}

// ============================================
// STORAGE MAP
// ============================================

export type StorageItemType = 
  | 'vacuum' | 'mop' | 'broom' | 'cleaning_supplies' | 'trash_bags'
  | 'linens' | 'towels' | 'toilet_paper' | 'paper_towels' | 'other';

export interface StorageLocation {
  id: string;
  itemType: StorageItemType;
  customItemName?: string;
  location: string;
  roomId?: string;
  notes?: string;
}

// ============================================
// PREFERENCES & RESTRICTIONS
// ============================================

export type PreferenceCategory = 'arrangement' | 'products' | 'timing' | 'method' | 'other';
export type PreferencePriority = 'must' | 'preferred';

export interface Preference {
  id: string;
  category: PreferenceCategory;
  description: string;
  priority: PreferencePriority;
}

export type RestrictionSeverity = 'warning' | 'critical';

export interface Restriction {
  id: string;
  description: string;
  severity: RestrictionSeverity;
  reason?: string;
}

// ============================================
// CHANGE HISTORY (Audit Trail)
// ============================================

export interface ChangeRecord {
  id: string;
  field: string;
  action: 'add' | 'update' | 'delete';
  changedBy: string;
  changedByRole: 'owner' | 'cleaner' | 'admin';
  changedAt: Date;
  previousValue?: any;
  newValue?: any;
}

// ============================================
// REFERENCE MEDIA
// ============================================

export interface ReferenceMediaItem {
  id: string;                          // Unique ID (use crypto.randomUUID() or Firestore auto-id)
  url: string;                         // Firebase Storage URL
  thumbnailUrl?: string;               // For videos, if available
  fileName: string;                    // Original file name
  type: 'photo' | 'video';            // Media type
  mediaType: 'how_to' | 'reference' | 'location'; // What kind of reference is this?
                                       // how_to = "How to do something"
                                       // reference = "What it should look like when done"
                                       // location = "Where something is stored"
  description: string;                 // Human-provided context
  roomId?: string;                     // Links to location's room structure (optional)
  roomName?: string;                   // Denormalized for display
  createdAt: string;                   // ISO timestamp
  createdBy?: string;                  // User email who added it
}

// ============================================
// COMBINED INTELLIGENCE
// ============================================

export interface LocationIntelligence {
  accessInfo?: AccessInfo;
  storageLocations?: StorageLocation[];
  preferences?: Preference[];
  restrictions?: Restriction[];
  referenceMedia?: ReferenceMediaItem[];  // NEW
  changeHistory?: ChangeRecord[];
}


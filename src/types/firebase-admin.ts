import type { 
  QueryDocumentSnapshot, 
  DocumentSnapshot,
  Timestamp 
} from 'firebase-admin/firestore';

export type FirestoreDocSnapshot = DocumentSnapshot;
export type FirestoreQueryDocSnapshot = QueryDocumentSnapshot;
export type FirestoreTimestamp = Timestamp;

// Helper type for task data
export interface TaskData {
  title: string;
  description: string;
  category: string;
  locationId: string;
  locationName: string;
  estimatedDuration: number | null;
  priority: 'low' | 'medium' | 'high';
  status: string;
  state: string;
  assigned_to: string;
  createdAt: Date | Timestamp;
  createdBy: string;
  updatedAt: Date | Timestamp;
  partnerOrgId: string;
}

// Helper type for location data
export interface LocationData {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  partnerOrgId: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

// Helper type for media data
export interface MediaData {
  taskId: string;
  locationId: string;
  storageUrl: string;
  thumbnailUrl?: string;
  fileType: string;
  duration?: number;
  uploadedAt: Date | Timestamp;
  uploadedBy: string;
}


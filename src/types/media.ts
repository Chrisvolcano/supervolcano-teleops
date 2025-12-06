export type MediaSource = 'mobile_app' | 'web_owner' | 'web_contribute' | 'oem_upload';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface ContributorMedia {
  id: string;
  
  // Contributor info
  contributorId: string;
  contributorEmail: string;
  contributorName?: string;
  
  // File info
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  storagePath: string;
  durationSeconds?: number; // Extracted post-upload if possible
  
  // Optional location (free text, not a reference)
  locationText?: string | null;
  
  // Source & review
  source: 'web_contribute';
  reviewStatus: ReviewStatus;
  reviewedAt?: Date | null;
  reviewedBy?: string | null;
  rejectionReason?: string | null;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}


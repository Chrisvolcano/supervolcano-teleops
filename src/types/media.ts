export type MediaSource = 'mobile_app' | 'web_owner' | 'web_contribute' | 'oem_upload';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export type BlurStatus = 'none' | 'processing' | 'complete' | 'failed';

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
  durationSeconds?: number;
  
  // Optional location
  locationText?: string | null;
  
  // Source & review
  source: 'web_contribute';
  reviewStatus: ReviewStatus;
  reviewedAt?: Date | null;
  reviewedBy?: string | null;
  rejectionReason?: string | null;
  
  // Blur fields
  blurStatus: BlurStatus;
  blurredUrl?: string | null;
  blurredStoragePath?: string | null;
  blurredAt?: Date | null;
  facesDetected?: number | null;
  blurError?: string | null;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export type ExportStatus = 'preparing' | 'generating_zip' | 'ready' | 'expired' | 'failed';
export type DeliveryMethod = 'manifest' | 'zip' | 'both';

export interface TrainingExport {
  id: string;
  name: string;
  description?: string;
  partnerId?: string | null;
  partnerName?: string | null;
  status: ExportStatus;
  deliveryMethod: DeliveryMethod;
  videoIds: string[];
  videoCount: number;
  totalSizeBytes: number;
  totalDurationSeconds: number;
  manifestUrl?: string | null;
  zipUrl?: string | null;
  zipSizeBytes?: number | null;
  zipGeneratedAt?: Date | null;
  expiresAt: Date;
  createdAt: Date;
  createdBy: string;
  createdByEmail: string;
}


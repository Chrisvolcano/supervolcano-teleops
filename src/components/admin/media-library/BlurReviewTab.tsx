import { VideoItem } from '@/app/admin/robot-intelligence/media/page';

interface BlurReviewTabProps {
  media: VideoItem[];
}

export function BlurReviewTab({ media }: BlurReviewTabProps) {
  const needsBlur = media.filter(v => !v.blurStatus || v.blurStatus === 'pending' || (typeof v.reviewStatus === 'string' && v.reviewStatus !== 'approved'));

  return (
    <div>
      <p className="text-gray-500 mb-4">{needsBlur.length} videos need blur review</p>
      {/* Table will go here */}
    </div>
  );
}


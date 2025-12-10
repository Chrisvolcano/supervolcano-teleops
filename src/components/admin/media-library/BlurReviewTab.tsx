import { VideoItem } from '@/app/admin/robot-intelligence/media/page';

interface BlurReviewTabProps {
  media: VideoItem[];
}

export function BlurReviewTab({ media }: BlurReviewTabProps) {
  const needsBlur = media.filter(v => {
    // No blur status or not complete = needs blur
    if (!v.blurStatus || v.blurStatus === 'none') return true;
    // Has reviewStatus that's not approved = needs blur
    if (typeof v.reviewStatus === 'string' && v.reviewStatus !== 'approved') return true;
    return false;
  });

  return (
    <div>
      <p className="text-gray-500 mb-4">{needsBlur.length} videos need blur review</p>
      {/* Table will go here */}
    </div>
  );
}

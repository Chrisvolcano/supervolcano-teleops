import { VideoItem } from '@/app/admin/robot-intelligence/media/page';

interface LabelReviewTabProps {
  media: VideoItem[];
}

export function LabelReviewTab({ media }: LabelReviewTabProps) {
  const needsLabels = media.filter(v => v.aiStatus === 'pending');

  return (
    <div>
      <p className="text-gray-500 mb-4">{needsLabels.length} videos need labels</p>
      {/* Table + Process Batch button will go here */}
    </div>
  );
}


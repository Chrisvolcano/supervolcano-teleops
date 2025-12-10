import { VideoItem } from '@/app/admin/robot-intelligence/media/page';

interface ExportTabProps {
  media: VideoItem[];
}

export function ExportTab({ media }: ExportTabProps) {
  const exportReady = media.filter(v => v.reviewStatus === 'approved');

  return (
    <div>
      <p className="text-gray-500 mb-4">{exportReady.length} videos ready for export</p>
      {/* Table + Export button will go here */}
    </div>
  );
}


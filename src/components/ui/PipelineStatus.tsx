import { Eye, Tag, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface Stage {
  label: string;
  count: number;
  status?: 'pending' | 'active' | 'complete' | 'error';
}

interface PipelineStatusProps {
  label: string;
  stages: Stage[];
}

// Map stage labels to icons
const stageIcons: Record<string, React.ReactNode> = {
  'Blur': <Eye className="w-4 h-4" />,
  'Labels': <Tag className="w-4 h-4" />,
  'Running': <Loader2 className="w-4 h-4" />,
  'Done': <CheckCircle2 className="w-4 h-4" />,
  'Failed': <XCircle className="w-4 h-4" />,
};

export function PipelineStatus({ label, stages }: PipelineStatusProps) {
  const getStatusColor = (status?: string, count: number = 0) => {
    if (count === 0) return 'text-gray-400';
    
    switch (status) {
      case 'active': return 'text-blue-600';
      case 'complete': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="mb-4">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
        {label}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {stages.map((stage, index) => {
          const icon = stageIcons[stage.label];
          const colorClass = getStatusColor(stage.status, stage.count);
          const isZero = stage.count === 0;
          
          return (
            <div key={index} className="flex items-center gap-2">
              {index > 0 && (
                <span className="text-gray-400">→</span>
              )}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                isZero
                  ? 'text-gray-400 bg-gray-50 border-gray-100'
                  : `${colorClass} bg-white border-gray-200`
              }`}>
                {stage.status === 'active' && !isZero ? (
                  <Loader2 className={`w-4 h-4 ${colorClass} animate-spin`} />
                ) : (
                  icon && <span className={isZero ? 'text-gray-400' : colorClass}>{icon}</span>
                )}
                <span className={`text-sm font-medium ${isZero ? 'text-gray-400' : colorClass}`}>
                  {stage.label}
                </span>
                <span className={`text-xs font-semibold ${isZero ? 'text-gray-400' : ''}`}>
                  {stage.count}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


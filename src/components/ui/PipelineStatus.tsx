interface Stage {
  label: string;
  count: number;
  icon?: string; // emoji
  status?: 'pending' | 'active' | 'complete' | 'error';
}

interface PipelineStatusProps {
  label: string;
  stages: Stage[];
}

export function PipelineStatus({ label, stages }: PipelineStatusProps) {
  const getStatusColor = (status?: string) => {
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
        {stages.map((stage, index) => (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && (
              <span className="text-gray-400">→</span>
            )}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
              stage.count > 0 
                ? `${getStatusColor(stage.status)} bg-white border-gray-200` 
                : 'text-gray-400 bg-gray-50 border-gray-100'
            }`}>
              {stage.icon && <span className="text-sm">{stage.icon}</span>}
              <span className="text-sm font-medium">{stage.label}</span>
              <span className={`text-xs font-semibold ${
                stage.count > 0 ? '' : 'text-gray-400'
              }`}>
                {stage.count}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


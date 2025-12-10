interface ApprovalStatusProps {
  label: string;
  pending: number;
  approved: number;
  rejected: number;
  onClickPending?: () => void;
  onClickApproved?: () => void;
  onClickRejected?: () => void;
}

export function ApprovalStatus({ 
  label, 
  pending, 
  approved, 
  rejected,
  onClickPending,
  onClickApproved,
  onClickRejected,
}: ApprovalStatusProps) {
  return (
    <div className="mb-4">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
        {label}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={onClickPending}
          disabled={!onClickPending}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-sm font-medium transition ${
            pending > 0
              ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
              : 'bg-gray-50 border-gray-200 text-gray-400'
          } ${onClickPending ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <span className="text-amber-500">●</span>
          <span>{pending}</span>
          <span>Pending</span>
        </button>
        
        <button
          onClick={onClickApproved}
          disabled={!onClickApproved}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-sm font-medium transition ${
            approved > 0
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              : 'bg-gray-50 border-gray-200 text-gray-400'
          } ${onClickApproved ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <span className="text-emerald-600">●</span>
          <span>{approved}</span>
          <span>Approved</span>
        </button>
        
        <button
          onClick={onClickRejected}
          disabled={!onClickRejected}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-sm font-medium transition ${
            rejected > 0
              ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
              : 'bg-gray-50 border-gray-200 text-gray-400'
          } ${onClickRejected ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <span className="text-red-500">●</span>
          <span>{rejected}</span>
          <span>Rejected</span>
        </button>
      </div>
    </div>
  );
}


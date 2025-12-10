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
              ? 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100'
              : 'bg-gray-50 border-gray-200 text-gray-400'
          } ${onClickPending ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <span>🟡</span>
          <span>{pending}</span>
          <span>Pending</span>
        </button>
        
        <button
          onClick={onClickApproved}
          disabled={!onClickApproved}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-sm font-medium transition ${
            approved > 0
              ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
              : 'bg-gray-50 border-gray-200 text-gray-400'
          } ${onClickApproved ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <span>🟢</span>
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
          <span>🔴</span>
          <span>{rejected}</span>
          <span>Rejected</span>
        </button>
      </div>
    </div>
  );
}


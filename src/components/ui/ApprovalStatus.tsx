interface ApprovalStatusProps {
  label: string;
  pending: number;
  approved: number;
  rejected: number;
  onClickPending?: () => void;
  onClickApproved?: () => void;
  onClickRejected?: () => void;
  activeFilter?: 'pending' | 'approved' | 'rejected' | 'all';
}

export function ApprovalStatus({ 
  label, 
  pending, 
  approved, 
  rejected,
  onClickPending,
  onClickApproved,
  onClickRejected,
  activeFilter,
}: ApprovalStatusProps) {
  return (
    <div className="mb-4">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        {label}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={onClickPending}
          disabled={!onClickPending}
          className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 transition-colors ${
            activeFilter === 'pending'
              ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 ring-2 ring-yellow-500'
              : 'bg-gray-100 dark:bg-[#1f1f1f] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2a2a2a]'
          } ${onClickPending ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <span className="text-amber-500 dark:text-amber-400">●</span>
          <span>{pending}</span>
          <span>Pending</span>
        </button>
        
        <button
          onClick={onClickApproved}
          disabled={!onClickApproved}
          className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 transition-colors ${
            activeFilter === 'approved'
              ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 ring-2 ring-green-500'
              : 'bg-gray-100 dark:bg-[#1f1f1f] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2a2a2a]'
          } ${onClickApproved ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <span className="text-emerald-600 dark:text-emerald-400">●</span>
          <span>{approved}</span>
          <span>Approved</span>
        </button>
        
        <button
          onClick={onClickRejected}
          disabled={!onClickRejected}
          className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 transition-colors ${
            activeFilter === 'rejected'
              ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 ring-2 ring-red-500'
              : 'bg-gray-100 dark:bg-[#1f1f1f] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2a2a2a]'
          } ${onClickRejected ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <span className="text-red-500 dark:text-red-400">●</span>
          <span>{rejected}</span>
          <span>Rejected</span>
        </button>
      </div>
    </div>
  );
}


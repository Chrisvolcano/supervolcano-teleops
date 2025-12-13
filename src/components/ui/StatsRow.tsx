interface StatItem {
  value: string | number;
  label: string;
}

interface StatsRowProps {
  items: StatItem[];
}

export function StatsRow({ items }: StatsRowProps) {
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {items.map((item, index) => (
        <div 
          key={index}
          className={`bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#1f1f1f] rounded-lg p-3 ${
            index === 0 ? 'md:col-span-1' : ''
          }`}
        >
          <div className={`font-semibold text-gray-900 dark:text-white ${index === 0 ? 'text-xl' : 'text-lg'}`}>
            {item.value}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.label}</div>
        </div>
      ))}
    </div>
  );
}


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
          className={`bg-gray-50 border border-gray-200 rounded-lg p-3 ${
            index === 0 ? 'md:col-span-1' : ''
          }`}
        >
          <div className={`font-semibold text-gray-900 ${index === 0 ? 'text-xl' : 'text-lg'}`}>
            {item.value}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
        </div>
      ))}
    </div>
  );
}


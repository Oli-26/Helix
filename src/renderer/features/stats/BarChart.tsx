import { useState } from 'react';

interface Props {
  data: number[];
  labels: string[];
  color: string;
}

export function BarChart({ data, labels, color }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const max = Math.max(...data, 1);
  const chartHeight = 120;

  return (
    <div className="relative">
      <div className="flex items-end gap-[3px]" style={{ height: chartHeight }}>
        {data.map((value, i) => {
          const height = (value / max) * chartHeight;
          const isHovered = hoveredIndex === i;
          return (
            <div
              key={i}
              className="flex-1 relative group flex flex-col items-center justify-end"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Value tooltip on hover */}
              {isHovered && value > 0 && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-popover border border-default text-[10px] text-primary shadow-md whitespace-nowrap z-10">
                  {value}
                </div>
              )}
              <div
                className="w-full rounded-t-sm transition-all duration-200 cursor-pointer"
                style={{
                  height: Math.max(value > 0 ? 2 : 0, height),
                  backgroundColor: color,
                  opacity: isHovered ? 1 : 0.7,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-[3px] mt-2">
        {labels.map((label, i) => (
          <div
            key={i}
            className={`flex-1 text-center text-[10px] transition-colors ${
              hoveredIndex === i ? 'text-primary' : 'text-tertiary'
            }`}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';

const CELL_SIZE = 13;
const GAP = 3;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

interface Props {
  commitsByDay: Record<string, number>;
}

export function CommitHeatmap({ commitsByDay }: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const { weeks, monthHeaders, maxCount } = useMemo(() => {
    const today = new Date();
    // Go back ~52 weeks
    const start = new Date(today);
    start.setDate(start.getDate() - 364 - start.getDay()); // align to Sunday

    const weeks: { date: Date; count: number; key: string }[][] = [];
    let currentWeek: { date: Date; count: number; key: string }[] = [];
    const monthHeaders: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    let maxCount = 0;

    const cursor = new Date(start);
    while (cursor <= today) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      const count = commitsByDay[key] || 0;
      if (count > maxCount) maxCount = count;

      if (cursor.getDay() === 0 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      if (cursor.getMonth() !== lastMonth) {
        lastMonth = cursor.getMonth();
        monthHeaders.push({ label: MONTH_LABELS[lastMonth], weekIndex: weeks.length });
      }

      currentWeek.push({ date: new Date(cursor), count, key });
      cursor.setDate(cursor.getDate() + 1);
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);

    return { weeks, monthHeaders, maxCount };
  }, [commitsByDay]);

  const getColor = (count: number) => {
    if (count === 0) return 'var(--color-heatmap-0, rgba(128, 128, 128, 0.1))';
    const intensity = Math.min(count / Math.max(maxCount, 1), 1);
    if (intensity <= 0.25) return 'var(--color-heatmap-1, rgba(34, 197, 94, 0.3))';
    if (intensity <= 0.5) return 'var(--color-heatmap-2, rgba(34, 197, 94, 0.5))';
    if (intensity <= 0.75) return 'var(--color-heatmap-3, rgba(34, 197, 94, 0.75))';
    return 'var(--color-heatmap-4, rgba(34, 197, 94, 1))';
  };

  const labelWidth = 32;
  const svgWidth = labelWidth + weeks.length * (CELL_SIZE + GAP);
  const svgHeight = 20 + 7 * (CELL_SIZE + GAP);

  return (
    <div className="relative overflow-x-auto">
      <svg
        width={svgWidth}
        height={svgHeight}
        className="block"
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Month labels */}
        {monthHeaders.map((m, i) => (
          <text
            key={`${m.label}-${i}`}
            x={labelWidth + m.weekIndex * (CELL_SIZE + GAP)}
            y={10}
            className="fill-tertiary"
            fontSize={10}
          >
            {m.label}
          </text>
        ))}

        {/* Day labels */}
        {DAY_LABELS.map((label, i) =>
          label ? (
            <text
              key={i}
              x={0}
              y={20 + i * (CELL_SIZE + GAP) + CELL_SIZE - 2}
              className="fill-tertiary"
              fontSize={10}
            >
              {label}
            </text>
          ) : null,
        )}

        {/* Cells */}
        {weeks.map((week, wi) =>
          week.map((day) => {
            const dayOfWeek = day.date.getDay();
            const x = labelWidth + wi * (CELL_SIZE + GAP);
            const y = 18 + dayOfWeek * (CELL_SIZE + GAP);
            return (
              <rect
                key={day.key}
                x={x}
                y={y}
                width={CELL_SIZE}
                height={CELL_SIZE}
                rx={2}
                fill={getColor(day.count)}
                className="transition-colors duration-100 cursor-pointer"
                onMouseEnter={(e) => {
                  const label = day.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                  setTooltip({
                    x: e.clientX,
                    y: e.clientY,
                    text: `${day.count} commit${day.count !== 1 ? 's' : ''} on ${label}`,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          }),
        )}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2.5 py-1.5 rounded-lg bg-popover border border-default text-xs text-primary shadow-lg pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 30 }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3 text-xs text-tertiary justify-end">
        <span>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
          <span
            key={intensity}
            className="inline-block w-3 h-3 rounded-sm"
            style={{
              backgroundColor:
                intensity === 0
                  ? 'rgba(128, 128, 128, 0.1)'
                  : `rgba(34, 197, 94, ${intensity})`,
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

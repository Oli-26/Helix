import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Users, Calendar, Code, Loader2, Clock, TrendingUp } from 'lucide-react';
import { useRepoPath } from '../../stores/ui-store';
import { gitApi } from '../../api/git';
import type { RepoStats } from '../../../shared/git-types';
import { CommitHeatmap } from './CommitHeatmap';
import { BarChart } from './BarChart';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) =>
  i === 0 ? '12a' : i < 12 ? `${i}a` : i === 12 ? '12p' : `${i - 12}p`,
);

const EXT_COLORS: Record<string, string> = {
  ts: '#3178c6', tsx: '#3178c6', js: '#f7df1e', jsx: '#f7df1e',
  py: '#3572a5', rs: '#dea584', go: '#00add8', java: '#b07219',
  rb: '#701516', css: '#563d7c', scss: '#c6538c', html: '#e34c26',
  json: '#40b5a4', md: '#083fa1', yml: '#cb171e', yaml: '#cb171e',
  sh: '#89e051', sql: '#e38c00', c: '#555555', cpp: '#f34b7d',
  h: '#555555', swift: '#f05138', kt: '#a97bff', dart: '#00b4ab',
  vue: '#41b883', svelte: '#ff3e00', toml: '#9c4221', lock: '#6b7280',
};

function getExtColor(ext: string): string {
  return EXT_COLORS[ext] || '#6b7280';
}

export function StatsView() {
  const repoPath = useRepoPath();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['git', 'stats', repoPath],
    queryFn: () => gitApi.getStats(repoPath!),
    enabled: !!repoPath,
    staleTime: 60_000,
  });

  if (isLoading || !stats) {
    return (
      <div className="h-full flex items-center justify-center text-secondary">
        <Loader2 className="w-6 h-6 animate-spin mr-3" />
        <span className="text-sm">Crunching numbers...</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-primary">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-accent" />
          <h1 className="text-lg font-semibold text-primary">Repository Statistics</h1>
        </div>

        {/* Summary cards */}
        <SummaryCards stats={stats} />

        {/* Heatmap */}
        <Card title="Commit Activity" icon={<Calendar className="w-4 h-4" />}>
          <CommitHeatmap commitsByDay={stats.commitsByDay} />
        </Card>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Commits by Hour" icon={<Clock className="w-4 h-4" />}>
            <BarChart data={stats.commitsByHour} labels={HOUR_LABELS} color="var(--color-accent)" />
          </Card>
          <Card title="Commits by Day of Week" icon={<TrendingUp className="w-4 h-4" />}>
            <BarChart data={stats.commitsByDayOfWeek} labels={DAY_NAMES} color="var(--color-accent)" />
          </Card>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Top Contributors" icon={<Users className="w-4 h-4" />}>
            <ContributorList stats={stats} />
          </Card>
          <Card title="Languages" icon={<Code className="w-4 h-4" />}>
            <LanguageBreakdown stats={stats} />
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-default bg-secondary p-4">
      <h3 className="flex items-center gap-2 text-sm font-medium text-primary mb-4">
        <span className="text-accent">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function SummaryCards({ stats }: { stats: RepoStats }) {
  const spanDays = Math.max(1, Math.ceil((stats.lastCommitDate - stats.firstCommitDate) / 86400));
  const avgPerDay = (stats.totalCommits / spanDays).toFixed(1);
  const firstDate = new Date(stats.firstCommitDate * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <SummaryCard label="Total Commits" value={stats.totalCommits.toLocaleString()} />
      <SummaryCard label="Contributors" value={String(stats.contributors.length)} />
      <SummaryCard label="Avg / Day" value={avgPerDay} />
      <SummaryCard label="First Commit" value={firstDate} />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-default bg-tertiary p-4">
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-xs text-tertiary mt-1">{label}</div>
    </div>
  );
}

function ContributorList({ stats }: { stats: RepoStats }) {
  const top = stats.contributors.slice(0, 12);
  const maxCommits = top[0]?.commits || 1;

  return (
    <div className="space-y-2">
      {top.map((c) => (
        <div key={`${c.name}|${c.email}`} className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ backgroundColor: stringToColor(c.name) }}
          >
            {c.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm text-primary truncate">{c.name}</span>
              <span className="text-xs text-tertiary tabular-nums ml-2 flex-shrink-0">{c.commits}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-hover overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${(c.commits / maxCommits) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LanguageBreakdown({ stats }: { stats: RepoStats }) {
  const sorted = useMemo(() => {
    const entries = Object.entries(stats.languageBreakdown)
      .sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, c]) => s + c, 0);
    const top = entries.slice(0, 10);
    const otherCount = entries.slice(10).reduce((s, [, c]) => s + c, 0);
    if (otherCount > 0) top.push(['other', otherCount]);
    return { entries: top, total };
  }, [stats.languageBreakdown]);

  // Donut chart segments
  const segments = useMemo(() => {
    let offset = 0;
    return sorted.entries.map(([ext, count]) => {
      const pct = (count / sorted.total) * 100;
      const seg = { ext, count, pct, offset, color: getExtColor(ext) };
      offset += pct;
      return seg;
    });
  }, [sorted]);

  const circumference = 2 * Math.PI * 40;

  return (
    <div className="flex items-start gap-6">
      {/* Donut chart */}
      <svg viewBox="0 0 100 100" className="w-32 h-32 flex-shrink-0 -rotate-90">
        {segments.map((seg) => (
          <circle
            key={seg.ext}
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={seg.color}
            strokeWidth="16"
            strokeDasharray={`${(seg.pct / 100) * circumference} ${circumference}`}
            strokeDashoffset={-(seg.offset / 100) * circumference}
          />
        ))}
      </svg>

      {/* Legend */}
      <div className="flex-1 space-y-1.5 min-w-0">
        {segments.map((seg) => (
          <div key={seg.ext} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-primary font-mono">.{seg.ext}</span>
            <span className="text-tertiary ml-auto tabular-nums">{seg.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h < 0 ? h + 360 : h}, 55%, 50%)`;
}

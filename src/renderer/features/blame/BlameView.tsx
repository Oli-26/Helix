import { useState, useMemo } from 'react';
import { Allotment } from 'allotment';
import { useQuery } from '@tanstack/react-query';
import { Search, FileText, User, Clock, GitCommit } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRepoPath } from '../../stores/ui-store';
import { gitApi } from '../../api/git';

export function BlameView() {
  const repoPath = useRepoPath();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const { data: files, isLoading: filesLoading } = useQuery({
    queryKey: ['git', 'ls-files', repoPath],
    queryFn: () => gitApi.getTrackedFiles(repoPath!),
    enabled: !!repoPath,
    staleTime: 30_000,
  });

  const { data: blameData, isLoading: blameLoading } = useQuery({
    queryKey: ['git', 'blame', repoPath, selectedFile],
    queryFn: () => gitApi.getBlame(repoPath!, selectedFile!),
    enabled: !!repoPath && !!selectedFile,
  });

  const filtered = useMemo(() => {
    if (!files) return [];
    if (!filter) return files;
    const q = filter.toLowerCase();
    return files.filter((f) => f.toLowerCase().includes(q));
  }, [files, filter]);

  // Group consecutive lines by same commit for cleaner display
  const blameGroups = useMemo(() => {
    if (!blameData) return [];
    const groups: Array<{
      hash: string;
      author: string;
      date: string;
      startLine: number;
      lines: Array<{ lineNumber: number; content: string }>;
    }> = [];

    for (const line of blameData) {
      const last = groups[groups.length - 1];
      if (last && last.hash === line.hash) {
        last.lines.push({ lineNumber: line.lineNumber, content: line.content });
      } else {
        groups.push({
          hash: line.hash,
          author: line.author,
          date: line.date,
          startLine: line.lineNumber,
          lines: [{ lineNumber: line.lineNumber, content: line.content }],
        });
      }
    }
    return groups;
  }, [blameData]);

  if (!repoPath) {
    return (
      <div className="flex items-center justify-center h-full text-secondary text-sm">
        No repository selected
      </div>
    );
  }

  return (
    <Allotment>
      {/* Left: file picker */}
      <Allotment.Pane minSize={200} preferredSize={260}>
        <div className="h-full flex flex-col bg-primary">
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary flex-shrink-0">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
              Files
            </span>
            <span className="text-xs text-tertiary">
              ({files?.length || 0})
            </span>
          </div>
          <div className="px-3 py-2 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-placeholder" />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter files..."
                className="w-full bg-input border border-default rounded-lg pl-8 pr-3 py-1.5 text-xs text-primary placeholder:text-placeholder focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filesLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-tertiary">
                Loading files...
              </div>
            ) : (
              filtered.map((file) => (
                <button
                  key={file}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full flex items-center gap-2 px-4 py-1.5 text-left transition-colors ${
                    selectedFile === file
                      ? 'bg-accent-muted ring-1 ring-inset ring-accent/30'
                      : 'hover:bg-hover'
                  }`}
                >
                  <FileText className="w-3 h-3 text-tertiary flex-shrink-0" />
                  <span className="text-xs text-primary truncate font-mono">
                    {file}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </Allotment.Pane>

      {/* Right: blame annotations */}
      <Allotment.Pane>
        {selectedFile ? (
          <div className="h-full flex flex-col bg-primary">
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary flex-shrink-0 border-b border-default">
              <FileText className="w-4 h-4 text-accent" />
              <span className="text-sm text-primary font-mono">
                {selectedFile}
              </span>
            </div>
            {blameLoading ? (
              <div className="flex items-center justify-center flex-1 text-sm text-tertiary">
                Loading blame...
              </div>
            ) : (
              <div className="flex-1 overflow-auto font-mono text-xs">
                {blameGroups.map((group, gi) => (
                  <div
                    key={`${group.hash}-${group.startLine}`}
                    className={`flex ${gi % 2 === 0 ? 'bg-primary' : 'bg-secondary'}`}
                  >
                    {/* Blame gutter */}
                    <div className="w-[260px] flex-shrink-0 border-r border-default px-3 py-0.5 select-none">
                      <div className="flex items-center gap-2 text-tertiary">
                        <GitCommit className="w-3 h-3 flex-shrink-0" />
                        <span className="text-accent truncate" title={group.hash}>
                          {group.hash.slice(0, 8)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-tertiary mt-0.5">
                        <User className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{group.author}</span>
                      </div>
                      <div className="flex items-center gap-2 text-tertiary mt-0.5">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">
                          {formatDistanceToNow(new Date(group.date), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                    {/* Code lines */}
                    <div className="flex-1 min-w-0">
                      {group.lines.map((line) => (
                        <div
                          key={line.lineNumber}
                          className="flex hover:bg-hover/50"
                        >
                          <span className="w-12 text-right pr-3 text-tertiary select-none flex-shrink-0">
                            {line.lineNumber}
                          </span>
                          <pre className="flex-1 pr-4 whitespace-pre overflow-x-auto text-primary">
                            {line.content || ' '}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-secondary">
            <FileText className="w-10 h-10 mb-3 text-tertiary" />
            <span className="text-sm">Select a file to view blame</span>
          </div>
        )}
      </Allotment.Pane>
    </Allotment>
  );
}

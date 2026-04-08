import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FolderOpen,
  GitBranch,
  Download,
  Plus,
  Clock,
  ArrowRight,
  Folder,
} from 'lucide-react';
import { useUIStore } from '../../stores/ui-store';
import { gitApi } from '../../api/git';
import { appApi } from '../../api/app';

export function Dashboard() {
  const addTab = useUIStore((s) => s.addTab);
  const [recentRepos, setRecentRepos] = useState<string[]>([]);
  const [cloneUrl, setCloneUrl] = useState('');
  const [showClone, setShowClone] = useState(false);

  useEffect(() => {
    appApi.getRecentRepos().then(setRecentRepos);
  }, []);

  const handleOpen = async () => {
    const path = await gitApi.openRepo();
    if (path) {
      await appApi.addRecentRepo(path);
      addTab(path);
    }
  };

  const handleClone = async () => {
    if (!cloneUrl.trim()) return;
    // TODO: directory picker for clone destination
  };

  const handleOpenRecent = async (path: string) => {
    await appApi.addRecentRepo(path);
    addTab(path);
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-primary overflow-y-auto">
      <div className="max-w-2xl w-full px-8 py-12">
        {/* Logo and welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-muted mb-6">
            <GitBranch className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">
            Welcome to Helix
          </h1>
          <p className="text-secondary text-base">
            A beautiful, fast, and free Git client
          </p>
        </motion.div>

        {/* Action cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-3 gap-4 mb-10"
        >
          <ActionCard
            icon={<FolderOpen className="w-5 h-5" />}
            title="Open Repo"
            description="Open a local repository"
            onClick={handleOpen}
          />
          <ActionCard
            icon={<Download className="w-5 h-5" />}
            title="Clone"
            description="Clone from URL"
            onClick={() => setShowClone(!showClone)}
          />
          <ActionCard
            icon={<Plus className="w-5 h-5" />}
            title="Init"
            description="Create new repository"
            onClick={handleOpen}
          />
        </motion.div>

        {/* Clone input */}
        {showClone && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={cloneUrl}
                onChange={(e) => setCloneUrl(e.target.value)}
                placeholder="https://github.com/user/repo.git"
                className="flex-1 bg-input border border-default rounded-lg px-4 py-2.5 text-sm text-primary placeholder:text-placeholder focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                autoFocus
              />
              <button
                onClick={handleClone}
                className="px-5 py-2.5 bg-accent text-text-inverse rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors"
              >
                Clone
              </button>
            </div>
          </motion.div>
        )}

        {/* Recent repos */}
        {recentRepos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="flex items-center gap-2 text-sm font-semibold text-secondary mb-3">
              <Clock className="w-4 h-4" />
              Recent Repositories
            </h2>
            <div className="space-y-1">
              {recentRepos.map((repoPath) => (
                <button
                  key={repoPath}
                  onClick={() => handleOpenRecent(repoPath)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-hover transition-colors group text-left"
                >
                  <Folder className="w-4 h-4 text-accent flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-primary truncate">
                      {repoPath.split('/').pop()}
                    </div>
                    <div className="text-xs text-tertiary truncate">
                      {repoPath}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex flex-col items-center gap-3 p-6 rounded-xl border border-default bg-secondary hover:bg-tertiary hover:border-accent/30 transition-colors"
    >
      <div className="p-3 rounded-lg bg-accent-muted text-accent">
        {icon}
      </div>
      <div className="text-center">
        <div className="text-sm font-medium text-primary">{title}</div>
        <div className="text-xs text-tertiary mt-0.5">{description}</div>
      </div>
    </motion.button>
  );
}

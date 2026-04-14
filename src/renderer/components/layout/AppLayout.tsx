import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import { TitleBar } from './TitleBar';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { useUIStore , useRepoPath, useCurrentView } from '../../stores/ui-store';
import { Dashboard } from '../../features/dashboard/Dashboard';
import { HistoryView } from '../../features/history/HistoryView';
import { StagingView } from '../../features/staging/StagingView';
import { BranchList } from '../../features/branches/BranchList';
import { RemotePanel } from '../../features/remotes/RemotePanel';
import { StashPanel } from '../../features/stash/StashPanel';
import { ConflictView } from '../../features/conflicts/ConflictView';
import { SearchView } from '../../features/search/SearchView';
import { SubmodulePanel } from '../../features/submodules/SubmodulePanel';
import { BlameView } from '../../features/blame/BlameView';
import { StatsView } from '../../features/stats/StatsView';
import { ConstellationView } from '../../features/constellation/ConstellationView';
import { SettingsView } from '../../features/settings/SettingsView';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { AnimatePresence, motion } from 'framer-motion';

export function AppLayout() {
  const currentView = useCurrentView();
  const repoPath = useRepoPath();
  const tabs = useUIStore((s) => s.tabs);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);

  if (tabs.length === 0) {
    return (
      <div className="h-screen flex flex-col">
        <TitleBar />
        <Dashboard />
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'history':
        return <HistoryView />;
      case 'staging':
        return <StagingView />;
      case 'branches':
        return <BranchList />;
      case 'remotes':
        return <RemotePanel />;
      case 'stashes':
        return <StashPanel />;
      case 'conflicts':
        return <ConflictView />;
      case 'search':
        return <SearchView />;
      case 'submodules':
        return <SubmodulePanel />;
      case 'blame':
        return <BlameView />;
      case 'stats':
        return <StatsView />;
      case 'constellation':
        return <ConstellationView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <HistoryView />;
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <TitleBar />
      <div className="flex-1 overflow-hidden">
        <Allotment>
          {!sidebarCollapsed && (
            <Allotment.Pane minSize={180} preferredSize={260} maxSize={400}>
              <Sidebar />
            </Allotment.Pane>
          )}
          <Allotment.Pane>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${repoPath}-${currentView}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                <ErrorBoundary key={`${repoPath}-${currentView}`} fallbackTitle={`Error loading ${currentView} view`}>
                  {renderView()}
                </ErrorBoundary>
              </motion.div>
            </AnimatePresence>
          </Allotment.Pane>
        </Allotment>
      </div>
      <StatusBar />
    </div>
  );
}

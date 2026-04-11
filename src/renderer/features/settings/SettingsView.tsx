import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, User, Mail, Sun, Moon, Columns, Rows3 } from 'lucide-react';
import { useRepoPath, useUIStore } from '../../stores/ui-store';
import { useThemeStore } from '../../stores/theme-store';
import { gitApi } from '../../api/git';
import { toast } from '../../components/ui/Toast';
import type { GitConfig } from '../../../shared/git-types';

export function SettingsView() {
  const repoPath = useRepoPath();
  const queryClient = useQueryClient();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const diffViewMode = useUIStore((s) => s.diffViewMode);
  const setDiffViewMode = useUIStore((s) => s.setDiffViewMode);

  const { data: config, isLoading } = useQuery({
    queryKey: ['git', 'config', repoPath],
    queryFn: () => gitApi.getGitConfig(repoPath!),
    enabled: !!repoPath,
  });

  const [localName, setLocalName] = useState('');
  const [localEmail, setLocalEmail] = useState('');
  const [globalName, setGlobalName] = useState('');
  const [globalEmail, setGlobalEmail] = useState('');

  useEffect(() => {
    if (config) {
      setLocalName(config.userName || '');
      setLocalEmail(config.userEmail || '');
      setGlobalName(config.globalUserName || '');
      setGlobalEmail(config.globalUserEmail || '');
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async (changes: Array<{ key: string; value: string; global: boolean }>) => {
      for (const { key, value, global } of changes) {
        if (value) {
          await gitApi.setGitConfig(repoPath!, key, value, global);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git', 'config'] });
      toast.success('Settings saved');
    },
    onError: (err: any) => {
      toast.error('Failed to save', err.message);
    },
  });

  const handleSaveLocal = () => {
    const changes: Array<{ key: string; value: string; global: boolean }> = [];
    if (localName !== (config?.userName || ''))
      changes.push({ key: 'user.name', value: localName, global: false });
    if (localEmail !== (config?.userEmail || ''))
      changes.push({ key: 'user.email', value: localEmail, global: false });
    if (changes.length > 0) saveMutation.mutate(changes);
  };

  const handleSaveGlobal = () => {
    const changes: Array<{ key: string; value: string; global: boolean }> = [];
    if (globalName !== (config?.globalUserName || ''))
      changes.push({ key: 'user.name', value: globalName, global: true });
    if (globalEmail !== (config?.globalUserEmail || ''))
      changes.push({ key: 'user.email', value: globalEmail, global: true });
    if (changes.length > 0) saveMutation.mutate(changes);
  };

  if (!repoPath) {
    return (
      <div className="flex items-center justify-center h-full text-secondary text-sm">
        No repository selected
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-secondary text-sm">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-primary">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        <h1 className="text-xl font-semibold text-primary">Settings</h1>

        {/* Appearance */}
        <Section title="Appearance">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-secondary mb-2 block">
                Theme
              </label>
              <div className="flex gap-2">
                <ToggleButton
                  active={theme === 'dark'}
                  onClick={() => setTheme('dark')}
                  icon={<Moon className="w-4 h-4" />}
                  label="Dark"
                />
                <ToggleButton
                  active={theme === 'light'}
                  onClick={() => setTheme('light')}
                  icon={<Sun className="w-4 h-4" />}
                  label="Light"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-secondary mb-2 block">
                Diff View
              </label>
              <div className="flex gap-2">
                <ToggleButton
                  active={diffViewMode === 'unified'}
                  onClick={() => setDiffViewMode('unified')}
                  icon={<Rows3 className="w-4 h-4" />}
                  label="Unified"
                />
                <ToggleButton
                  active={diffViewMode === 'split'}
                  onClick={() => setDiffViewMode('split')}
                  icon={<Columns className="w-4 h-4" />}
                  label="Split"
                />
              </div>
            </div>
          </div>
        </Section>

        {/* Local Git Config */}
        <Section
          title="Repository Git Config"
          description="These settings apply only to this repository."
        >
          <div className="space-y-3">
            <InputField
              icon={<User className="w-3.5 h-3.5" />}
              label="Name"
              value={localName}
              onChange={setLocalName}
              placeholder={config?.globalUserName || 'Your name'}
            />
            <InputField
              icon={<Mail className="w-3.5 h-3.5" />}
              label="Email"
              value={localEmail}
              onChange={setLocalEmail}
              placeholder={config?.globalUserEmail || 'your@email.com'}
            />
            <div className="flex justify-end">
              <button
                onClick={handleSaveLocal}
                disabled={
                  saveMutation.isPending ||
                  (localName === (config?.userName || '') &&
                    localEmail === (config?.userEmail || ''))
                }
                className="flex items-center gap-2 px-4 py-1.5 bg-accent text-text-inverse rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Save Local
              </button>
            </div>
          </div>
        </Section>

        {/* Global Git Config */}
        <Section
          title="Global Git Config"
          description="These settings apply to all repositories on this machine."
        >
          <div className="space-y-3">
            <InputField
              icon={<User className="w-3.5 h-3.5" />}
              label="Name"
              value={globalName}
              onChange={setGlobalName}
              placeholder="Your name"
            />
            <InputField
              icon={<Mail className="w-3.5 h-3.5" />}
              label="Email"
              value={globalEmail}
              onChange={setGlobalEmail}
              placeholder="your@email.com"
            />
            <div className="flex justify-end">
              <button
                onClick={handleSaveGlobal}
                disabled={
                  saveMutation.isPending ||
                  (globalName === (config?.globalUserName || '') &&
                    globalEmail === (config?.globalUserEmail || ''))
                }
                className="flex items-center gap-2 px-4 py-1.5 bg-accent text-text-inverse rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Save Global
              </button>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-secondary border border-default rounded-xl p-5">
      <h2 className="text-sm font-semibold text-primary mb-1">{title}</h2>
      {description && (
        <p className="text-xs text-tertiary mb-4">{description}</p>
      )}
      {!description && <div className="mb-4" />}
      {children}
    </div>
  );
}

function InputField({
  icon,
  label,
  value,
  onChange,
  placeholder,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-secondary w-20 flex-shrink-0">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-input border border-default rounded-lg px-3 py-1.5 text-sm text-primary placeholder:text-placeholder focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
      />
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
        active
          ? 'bg-accent-muted border-accent/30 text-accent'
          : 'bg-primary border-default text-secondary hover:text-primary hover:bg-hover'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

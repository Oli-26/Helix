# Changelog

## Unreleased

### Repository Statistics Dashboard
- New **Stats** view with comprehensive repository analytics
- **Commit heatmap**: GitHub-style 52-week calendar showing daily commit activity with hover tooltips
- **Commits by hour**: bar chart showing when commits happen throughout the day
- **Commits by day of week**: bar chart showing most productive days
- **Top contributors**: ranked list with proportional bars and color-hashed avatars
- **Language breakdown**: donut chart colored by file extension with percentage legend
- **Summary cards**: total commits, contributors, average commits/day, first commit date

### File Constellation Map
- New **Constellation** view — a force-directed graph visualization of file co-change patterns
- Files that frequently change together cluster as "constellations" revealing hidden coupling
- Stars colored by language/extension, sized by change frequency, with glow effects
- Pan and zoom with mouse, hover any star to see its connections and co-change partners
- Info panel shows file path, change count, and top co-changed files
- Legend showing file type distribution, space-themed dark background with decorative stars
- Backend analyzes up to 1000 commits for co-change patterns, caps at 300 nodes/1500 edges

### Comprehensive UI Polish
- **Focus-visible rings** on all focusable elements for keyboard accessibility
- **Active press feedback** — buttons scale on press for tactile feel
- **Popover backgrounds** — dedicated CSS variable for context menus and tooltips in both themes
- Context menus now use consistent `bg-popover` styling with better shadow/border treatment
- Inset separator margins in all context menus for cleaner look
- Smoother animation curves on menu open/close (custom ease)

### ContextMenu Improvements
- **Keyboard navigation**: Arrow Up/Down to move between items, Enter to select
- Mouse hover and keyboard focus stay in sync
- Skips disabled items when navigating with keyboard
- Disabled items show `cursor-not-allowed`

### BranchList Overhaul
- **Right-click context menu** on every branch: Checkout, Merge into current, Rebase onto, Copy name, Delete
- **Merge and Rebase** with confirmation dialogs before execution
- **Delete** with confirmation dialog
- **Tracking info** per branch (ahead/behind remote indicators)
- **Last commit date** shown per branch as relative time
- **Remote branches** now clickable to checkout as local, with their own context menu
- **Collapsible remote section** with chevron toggle
- **Hover action buttons**: merge and delete icons appear on hover
- **Toast feedback** on all branch operations (checkout, create, merge, rebase, delete)

### HistoryView Improvements
- **Hard reset requires confirmation** via modal before executing
- **Revert requires confirmation** via modal
- **Hover copy button** on every commit row for one-click hash copy
- **Overflow indicator** — shows "+N" when branch/tag refs exceed visible limit
- HEAD indicator now pulses for visibility

### StagingView Improvements
- **Discard requires confirmation** — all discard operations go through a confirmation modal
- **Select All button** in both staged/unstaged multi-select bars
- Selection bar now appears at 1+ selected (was 2+)
- **Toast feedback** on stage, unstage, discard, and commit operations with error messages

### RemotePanel Improvements
- **Force push requires confirmation** via danger-styled modal
- Force push button changes to warning color when enabled
- **Copy URL button** on hover for each remote entry
- **Toast feedback** on all push/pull/fetch operations with detailed error messages
- Quick action buttons show colored borders on success/error states

### StatusBar Improvements
- **Rich tooltips** on every element explaining what it does and what clicking will do
- **Ahead/Behind is clickable** — navigates to Remotes view
- **Repo state label is clickable** — navigates to Conflicts view when merging/rebasing
- **Last fetch is clickable** — triggers a manual fetch
- Fetch errors now show toast with error message

### Testing
- Set up **Vitest** testing framework with TypeScript support
- 88 unit tests across 4 test suites:
  - `git-diff-parser`: 12 tests covering all diff scenarios (added/deleted/renamed/modified files, multiple hunks, line numbers, edge cases)
  - `graph-layout`: 12 tests for the commit graph algorithm (lane assignment, merges, branching, lane cap, edge colors)
  - `stores`: 30 tests for Zustand stores (UI tabs/views/selections, branch prefs favourites/folders/sorting, theme toggle)
  - `git-service`: 34 tests with mocked simple-git (log parsing, status mapping, branch filtering, stats aggregation, constellation analysis, tags, blame, search)

### Backend / API
- Added `git:stats` IPC channel for repository statistics
- Added `git:file-constellation` IPC channel for co-change analysis
- Added `RepoStats`, `ContributorStats`, `FileConstellationData`, `ConstellationNode`, `ConstellationEdge` types
- Removed dead `git:stage-hunk` IPC channel declaration (was never implemented)
- Added `git:cherry-pick`, `git:revert`, `git:reset` IPC channels
- Added `git:stash-pop` IPC channel
- Added `git:tags`, `git:create-tag`, `git:delete-tag`, `git:push-tag` IPC channels
- Added `git:get-config`, `git:set-config` IPC channels for git configuration
- Added `git:ls-files` IPC channel for listing tracked files
- Added `TagInfo` and `GitConfig` types
- `getCommitByHash` now returns full commit body (multi-line messages)

### Staging / Commit View
- **Multi-select files** in staged/unstaged sections (Ctrl+Click to toggle, Shift+Click for range)
- **Selection bar** appears when files are selected with bulk Stage, Unstage, and Discard actions
- **Right-click context menu** on files with Stage/Unstage, Discard Changes, and Copy Path actions
- **Amend commit** checkbox pre-fills with last commit's subject
- **File tree grouping** toggle: flat list or collapsible directory tree view
- **Drag and drop** files between sections to stage/unstage

### History View
- **Commit context menu**: Cherry-pick, Revert, Create Branch Here, Reset (soft/mixed/hard), Copy Hash, Copy Message
- **Full commit body** in detail panel
- **Keyboard navigation**: Arrow keys or j/k to move through commits

### Blame View
- File picker with search/filter, blame annotations grouped by commit
- Shows commit hash, author, and relative date per group

### Tag Management
- Tags section in sidebar with create, delete, push, and context menu
- Annotated tag support with badge indicator

### Stash Panel
- Pop stash, view stash diffs with expandable file-level diffs

### Settings Panel
- Theme toggle, diff view mode, repository and global git config editing

### Command Palette
- Navigation commands for all views including Stats and Constellation
- Branch/tag checkout, push/pull/fetch/stash actions with toast feedback

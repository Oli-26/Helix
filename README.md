<p align="center">
  <img src="assets/icon.svg" width="80" alt="Helix logo" />
</p>

<h1 align="center">Helix</h1>

<p align="center">
  A beautiful, fast, and free Git client for Linux, macOS, and Windows.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#development">Development</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

---

## Features

- **Visual commit graph** — Canvas-rendered branch visualization with color-coded lanes and smooth bezier curves
- **Rich diff viewer** — Unified and side-by-side diffs with syntax highlighting, hunk-level staging
- **Staging area** — Stage/unstage files, hunks, or individual lines with a clean drag-and-drop interface
- **Branch management** — Create, checkout, merge, rebase, and delete branches
- **Remote operations** — Push, pull, and fetch with progress indicators and force-push safety warnings
- **Stash management** — Save, apply, and drop stashes with optional messages
- **Conflict resolution** — Guided merge conflict UI with accept ours/theirs/both actions
- **Submodule management** — Add, update, sync, and remove submodules with status indicators
- **Command palette** — Quick access to every action with `Ctrl+K`
- **Search** — Find commits by message, author, or hash
- **Dark & light themes** — Beautiful dark mode by default, with instant theme switching
- **Keyboard-first** — Comprehensive shortcuts for every action

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Electron 41 |
| Frontend | React 19, TypeScript 5 |
| Build | Vite 5, Electron Forge 7 |
| Git | simple-git (wraps system `git`) |
| State | Zustand, TanStack React Query |
| Styling | Tailwind CSS 3, Framer Motion |
| UI | Allotment (panels), react-virtuoso (lists), cmdk (palette), Lucide (icons) |

## Installation

### Pre-built packages

Download the latest release for your platform from the [Releases](https://github.com/Oli-26/Helix/releases) page.

### Build from source

```bash
git clone https://github.com/Oli-26/Helix.git
cd Helix
npm install
npm start
```

### Package for distribution

```bash
npm run make
```

Built packages will be in the `out/` directory.

## Development

### Prerequisites

- Node.js 18+
- npm 9+
- Git 2.25+

### Getting started

```bash
# Clone the repo
git clone https://github.com/Oli-26/Helix.git
cd Helix

# Install dependencies
npm install

# Start in development mode (with hot reload)
npm start

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

### Project structure

```
helix/
├── src/
│   ├── main/              # Electron main process
│   │   ├── git/           # Git service layer (simple-git wrapper)
│   │   └── ipc/           # IPC handler registration
│   ├── preload/           # Context bridge (secure IPC)
│   ├── renderer/          # React application
│   │   ├── api/           # Typed IPC wrappers
│   │   ├── components/    # Shared UI components
│   │   ├── features/      # Feature modules (history, staging, branches, etc.)
│   │   ├── hooks/         # React Query hooks
│   │   ├── stores/        # Zustand state stores
│   │   └── styles/        # Tailwind config, themes
│   └── shared/            # Types shared between main & renderer
└── tests/                 # Unit, integration, and e2e tests
```

### Architecture

Helix follows a strict security model:

- **Main process** — All Git operations and file system access
- **Preload script** — Typed IPC bridge via `contextBridge`
- **Renderer** — React UI with no direct Node.js access
- `contextIsolation: true`, `nodeIntegration: false`

Git data flows through **React Query** for caching and background refresh. UI state lives in **Zustand** stores. A file watcher (`chokidar`) monitors `.git/` for changes and triggers targeted query invalidation.

### Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Command palette |
| `Ctrl+1` | History view |
| `Ctrl+2` | Changes view |
| `Ctrl+3` | Branches view |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+D` | Toggle diff mode (unified/split) |
| `Ctrl+Enter` | Commit staged changes |

## Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) before submitting a pull request.

## License

[MIT](LICENSE) — free for personal and commercial use.

# Contributing to Helix

Thanks for your interest in contributing to Helix! This guide will help you get started.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/Helix.git`
3. Create a branch: `git checkout -b my-feature`
4. Install dependencies: `npm install`
5. Start development: `npm start`

## Development Workflow

### Making changes

1. Make your changes in a feature branch
2. Run the type checker: `npx tsc --noEmit`
3. Run the linter: `npm run lint`
4. Test your changes manually by running the app
5. Commit with a clear message describing *what* and *why*

### Commit messages

Use clear, descriptive commit messages:

```
Add branch rename dialog

Users can now rename branches by right-clicking in the sidebar
and selecting "Rename". Validates the new name against git
naming rules before applying.
```

- Use imperative mood ("Add feature" not "Added feature")
- First line under 72 characters
- Add a blank line before the body if needed
- Explain *why*, not just *what*

### Pull requests

1. Push your branch to your fork
2. Open a PR against `main`
3. Fill out the PR template with a summary and test plan
4. Wait for review — we aim to respond within a few days

### What makes a good PR

- **Focused** — One feature or fix per PR
- **Tested** — Describe how you tested your changes
- **Clean** — No unrelated changes, no debug logging left in

## Project Architecture

### Main Process (`src/main/`)

All Git operations and file system access happen here. The `git-service.ts` wraps `simple-git` and exposes methods that IPC handlers call.

### Renderer (`src/renderer/`)

The React app. It has no direct Node.js or Git access — everything goes through typed IPC channels defined in `src/shared/ipc-types.ts`.

### Adding a new feature

1. Define IPC types in `src/shared/ipc-types.ts`
2. Implement the Git logic in `src/main/git/`
3. Register IPC handlers in `src/main/ipc/`
4. Add API wrappers in `src/renderer/api/`
5. Create React Query hooks in `src/renderer/hooks/`
6. Build the UI in `src/renderer/features/`

### Code style

- TypeScript strict mode
- Functional React components with hooks
- Tailwind CSS for styling (no inline styles or CSS modules)
- Framer Motion for animations
- Zustand for UI state, React Query for Git data

## Reporting Issues

- Use GitHub Issues
- Include steps to reproduce
- Include your OS, Node.js version, and Git version
- Attach screenshots if it's a UI issue

## Code of Conduct

Be respectful and constructive. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Helix, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please send a description of the vulnerability to the maintainers via a [private security advisory](https://github.com/Oli-26/Helix/security/advisories/new) on GitHub.

Include:

- A description of the vulnerability
- Steps to reproduce
- The potential impact
- Any suggested fix (if you have one)

We will acknowledge your report within 48 hours and aim to release a fix within 7 days for critical issues.

## Security Model

Helix follows Electron security best practices:

- **Context isolation** is enabled — the renderer has no direct access to Node.js APIs
- **Node integration** is disabled in the renderer process
- **All Git operations** run in the main process via typed IPC channels
- **Content Security Policy** restricts resource loading
- **Electron Fuses** are configured to disable dangerous features in production builds

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | Yes       |
| Older   | No        |

We only provide security updates for the latest release.

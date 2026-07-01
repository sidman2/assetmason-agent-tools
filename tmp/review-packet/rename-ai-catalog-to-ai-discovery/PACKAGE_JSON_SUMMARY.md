# Package JSON Summary

## Root

- `private: true`
- workspaces: `packages/*`
- scripts: `build`, `lint`, `typecheck`, `test`, `pack:dry-run`, `names:check`
- `package-lock.json` exists locally as an untracked install artifact and is intentionally not part of this review branch

## `packages/ard-kit`

- version: `0.1.0-preview.0`
- `private` field absent
- publishable from package metadata
- exposes `dist/index.js`
- build compiles shared validator source
- package `files` include `dist`, `README.md`, and `LICENSE`

## `packages/ard-cli`

- version: `0.1.0-preview.0`
- `private` field absent
- publishable from package metadata
- binary: `ard-cli`
- depends on `ard-kit`
- build compiles CLI source
- package `files` include `dist`, `bin`, `README.md`, and `LICENSE`

## `packages/ai-discovery`

- version: `0.1.0-preview.0`
- `private` field absent
- publishable from package metadata
- binary: `ai-discovery`
- depends on `ard-kit`
- build compiles CLI source
- package `files` include `dist`, `bin`, `README.md`, and `LICENSE`

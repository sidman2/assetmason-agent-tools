# Package JSON Summary

## Root

- `private: true`
- workspaces: `packages/*`
- scripts: `build`, `lint`, `typecheck`, `test`, `pack:dry-run`, `names:check`
- no root `package-lock.json` is committed in this repo; this review pass keeps the workspace lockfile out of source control so the publish review stays focused on package contents rather than local install state

## `packages/ard-kit`

- version: `0.1.0-preview.0`
- local private package
- exposes `dist/index.js`
- build compiles shared validator source
- package `files` include `dist`, `README.md`, and `LICENSE`

## `packages/ard-cli`

- version: `0.1.0-preview.0`
- local private package
- binary: `ard-cli`
- depends on `ard-kit`
- build compiles CLI source
- package `files` include `dist`, `bin`, `README.md`, and `LICENSE`

## `packages/ai-catalog`

- version: `0.1.0-preview.0`
- local private package
- binary: `ai-catalog`
- depends on `ard-kit`
- build compiles CLI source
- package `files` include `dist`, `bin`, `README.md`, and `LICENSE`


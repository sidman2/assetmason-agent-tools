# Package JSON Summary

## Root

- `private: true`
- workspaces: `packages/*`
- scripts: `build`, `lint`, `typecheck`, `test`, `pack:dry-run`, `names:check`

## `packages/ard-kit`

- local private package
- exposes `dist/index.js`
- build compiles shared validator source

## `packages/ard-cli`

- local private package
- binary: `ard-cli`
- depends on `ard-kit`
- build compiles CLI source

## `packages/ai-catalog`

- local private package
- binary: `ai-catalog`
- depends on `ard-kit`
- build compiles CLI source


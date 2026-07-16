# Unreleased release notes draft

This branch hardens the public AssetMason npm package workflow without publishing anything.

## What changed

- Replaced the hard-coded private OneDrive path in execution-profile parity with explicit, manifest-defined configuration.
- Replaced the embedded stale source SHA with an explicit expected SHA input.
- Split public verification from private parity so public CI can pass without private-source access.
- Added durable run-state artifacts for resumable lane-based execution.
- Added a compact review packet and evidence trail for closeout.

## Verification

- `npm run generated-source:check`
- `npm run stale:check`
- `npm run typecheck`
- `npm test`
- `npm run pack:dry-run -w agent-resource-plan`
- `npm run pack:dry-run -w agent-execution-profile`
- `npm run pack:dry-run -w assetmason-cli`
- `node scripts/ci-pack-smoke.mjs`
- `npm run verify:public`

## Current boundary

- Public parity now skips private evaluation explicitly when private inputs are not configured.
- No package version bumps, dist-tag changes, or publication actions were performed.
- Broader contract-spine work remains unfinished and is still tracked in the run-state artifacts.

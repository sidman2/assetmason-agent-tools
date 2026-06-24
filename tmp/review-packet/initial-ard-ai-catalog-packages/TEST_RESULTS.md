# Test Results

## Passed

- `npm run typecheck`
- `npm run build`
- `npm test`
- `npm run pack:dry-run`

## Notes

- `npm test` runs a workspace build first so the CLI package entrypoints resolve cleanly.
- The root `lint` script is intentionally typecheck-only for this first package pass.


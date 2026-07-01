# Test Results

## Local checks

- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm test`: passed
- `npm run build`: passed
- `npm run pack:dry-run`: passed
- `npm run names:check`: passed with E404 availability results for unpublished names

## Publish dry-run checks

- `npm publish --dry-run --tag preview --workspace ard-kit`: passed
- `npm publish --dry-run --tag preview --workspace ai-discovery`: passed
- `npm publish --dry-run --tag preview --workspace ard-cli`: passed

## Tarball proof

- `npm pack --workspace ai-discovery --pack-destination tmp/npm-pack-proof`: passed
- `npm pack --workspace ard-cli --pack-destination tmp/npm-pack-proof`: passed
- `tar -tf` for both tarballs: passed
- Extracted wrapper `--help` checks: passed
- Packed manifest inspection for `ai-discovery`: passed

Notes:

- `package-lock.json` was removed after local install proof.
- No actual npm publish happened.

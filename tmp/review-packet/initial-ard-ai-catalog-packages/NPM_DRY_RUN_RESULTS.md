# NPM Dry Run Results

## Pack dry run

Ran successfully:

- `npm run pack:dry-run`

Observed tarballs:

- `ai-catalog-0.1.0-preview.0.tgz`
- `ard-cli-0.1.0-preview.0.tgz`
- `ard-kit-0.1.0-preview.0.tgz`

## Publish dry run

Ran:

- `npm publish --dry-run --workspace ard-kit`
- `npm publish --dry-run --workspace ai-catalog`
- `npm publish --dry-run --workspace ard-cli`

Results:

- `ard-kit`: blocked by `npm error You must specify a tag using --tag when publishing a prerelease version.`
- `ai-catalog`: blocked by the same prerelease tag requirement, with a publish-normalization warning about the `bin` field.
- `ard-cli`: blocked by the same prerelease tag requirement, with a publish-normalization warning about the `bin` field.

Notes:

- No npm publish happened.
- No credentials were entered or stored.
- The dry-run checks confirmed the packages are packaging cleanly enough for tarball inspection, but publish still needs an explicit prerelease tag.

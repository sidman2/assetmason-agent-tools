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

- `npm publish --dry-run --tag preview --workspace ard-kit`
- `npm publish --dry-run --tag preview --workspace ai-catalog`
- `npm publish --dry-run --tag preview --workspace ard-cli`

Results:

- `ard-kit`: succeeded as a dry run with tag `preview`.
- `ai-catalog`: succeeded as a dry run with tag `preview`, with a publish-normalization warning about the `bin` field.
- `ard-cli`: succeeded as a dry run with tag `preview`, with a publish-normalization warning about the `bin` field.
- npm also printed `This command requires you to be logged in to https://registry.npmjs.org/ (dry-run)`.

Notes:

- No npm publish happened.
- No credentials were entered or stored.
- The dry-run checks confirmed the packages are packaging cleanly enough for tarball inspection and that prerelease publish should use the preview tag.

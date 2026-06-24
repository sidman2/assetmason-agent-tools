# NPM Dry Run Results

Ran:

- `npm pack --dry-run --workspace ard-kit`
- `npm pack --dry-run --workspace ard-cli`
- `npm pack --dry-run --workspace ai-catalog`

Observed contents:

## `ard-kit`

- `README.md`
- `dist/index.d.ts`
- `dist/index.js`
- `dist/types.d.ts`
- `dist/types.js`
- `dist/validateAiCatalog.d.ts`
- `dist/validateAiCatalog.js`
- `package.json`

## `ard-cli`

- `README.md`
- `bin/ard-cli.js`
- `dist/index.d.ts`
- `dist/index.js`
- `dist/main.d.ts`
- `dist/main.js`
- `package.json`

## `ai-catalog`

- `README.md`
- `bin/ai-catalog.js`
- `dist/index.d.ts`
- `dist/index.js`
- `dist/main.d.ts`
- `dist/main.js`
- `package.json`

Notes:

- No `tmp/` files were included in the tarball contents.
- No tests were included in the tarball contents.
- No credential files or local path junk were included.


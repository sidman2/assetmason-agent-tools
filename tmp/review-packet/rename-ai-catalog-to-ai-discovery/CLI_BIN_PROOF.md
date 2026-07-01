# CLI Bin Proof

- Source `bin` field in `packages/ai-discovery/package.json`: `{ "ai-discovery": "bin/ai-discovery.js" }`
- Source `bin` field in `packages/ard-cli/package.json`: `{ "ard-cli": "bin/ard-cli.js" }`
- `directories.bin` exists: no
- `packages/ai-discovery/bin/ai-discovery.js` first line: `#!/usr/bin/env node`
- `packages/ard-cli/bin/ard-cli.js` first line: `#!/usr/bin/env node`
- Packed tarball contains `package/bin/ai-discovery.js`: yes
- Packed tarball contains `package/bin/ard-cli.js`: yes
- Packed `package/package.json` in `ai-discovery` keeps the `bin` object: yes
- Packed `package/package.json` in `ard-cli` keeps the `bin` object: yes
- Extracted tarball CLI help proof:
  - `node tmp/npm-pack-proof/ai-discovery/package/bin/ai-discovery.js --help`
  - `node tmp/npm-pack-proof/ard-cli/package/bin/ard-cli.js --help`
- npm publish dry-run still strips bin entries: no
- The previous publish-time `bin` invalid/removed warning did not reappear.

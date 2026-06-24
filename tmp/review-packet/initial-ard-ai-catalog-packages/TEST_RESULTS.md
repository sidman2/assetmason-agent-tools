# Test Results

Ran successfully:

- `npm install`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run pack:dry-run`
- `npm run names:check`
- `node packages/ard-cli/bin/ard-cli.js scan https://example.com --json`
- `node packages/ard-cli/bin/ard-cli.js scan https://example.com`
- `node packages/ard-cli/bin/ard-cli.js check fixtures/ai-catalog/valid-basic.ai-catalog.json --json`
- `node packages/ai-catalog/bin/ai-catalog.js validate fixtures/ai-catalog/valid-basic.ai-catalog.json --json`

Notes:

- `npm run names:check` now executes on this Windows workspace by invoking npm through Node.
- `npm test` includes a workspace build step before Vitest.


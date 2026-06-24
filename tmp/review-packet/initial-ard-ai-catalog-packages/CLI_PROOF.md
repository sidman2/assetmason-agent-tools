# CLI Proof

## `ard-cli`

- `node packages/ard-cli/bin/ard-cli.js scan https://example.com --json`
- Output was a single JSON object with no prose outside the object.
- `node packages/ard-cli/bin/ard-cli.js scan https://example.com`
- Output was readable JSON only.
- `node packages/ard-cli/bin/ard-cli.js check fixtures/ai-catalog/valid-basic.ai-catalog.json --json`
- Output was a single JSON object with no prose outside the object.

## `ai-catalog`

- `node packages/ai-catalog/bin/ai-catalog.js validate fixtures/ai-catalog/valid-basic.ai-catalog.json --json`
- Output was a single JSON object with no prose outside the object.


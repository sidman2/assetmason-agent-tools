# CLI Proof

## `ard-cli`

```text
$ node packages/ard-cli/bin/ard-cli.js --help
ard-cli check <path-or-url>
ard-cli scan <url>
ard-cli explain
```

```text
$ node packages/ard-cli/bin/ard-cli.js --version
0.0.0
```

```text
$ node packages/ard-cli/bin/ard-cli.js check fixtures/ai-catalog/valid-basic.ai-catalog.json
{
  "ok": true,
  "errors": [],
  "warnings": [],
  "summary": {
    "entriesCount": 2,
    "checkedAt": "2026-06-24T10:03:...",
    "profile": "assetmason-preview-ai-catalog"
  }
}
```

```text
$ node packages/ard-cli/bin/ard-cli.js check fixtures/ai-catalog/valid-basic.ai-catalog.json --json
{"ok":true,"errors":[],"warnings":[],"summary":{"entriesCount":2,"checkedAt":"2026-06-24T10:03:...","profile":"assetmason-preview-ai-catalog"}}
```

## `ai-catalog`

```text
$ node packages/ai-catalog/bin/ai-catalog.js --help
{
  "message": "ai-catalog validate <path-or-url>\nai-catalog explain\nai-catalog generate --url <url> --out <path>"
}
```

```text
$ node packages/ai-catalog/bin/ai-catalog.js --version
{
  "version": "0.0.0"
}
```

```text
$ node packages/ai-catalog/bin/ai-catalog.js validate fixtures/ai-catalog/valid-basic.ai-catalog.json
{
  "ok": true,
  "errors": [],
  "warnings": [],
  "summary": {
    "entriesCount": 2,
    "checkedAt": "2026-06-24T10:03:...",
    "profile": "assetmason-preview-ai-catalog"
  }
}
```

```text
$ node packages/ai-catalog/bin/ai-catalog.js validate fixtures/ai-catalog/valid-basic.ai-catalog.json --json
{"ok":true,"errors":[],"warnings":[],"summary":{"entriesCount":2,"checkedAt":"2026-06-24T10:03:...","profile":"assetmason-preview-ai-catalog"}}
```

```text
$ node packages/ai-catalog/bin/ai-catalog.js explain
{
  "what": "Preview ai-catalog.json validator and generator.",
  "checks": [
    "structure",
    "limited readiness signals"
  ],
  "doesNotCertify": [
    "safety",
    "compliance",
    "ranking",
    "indexing",
    "invocation"
  ]
}
```


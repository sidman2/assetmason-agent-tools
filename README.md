# AssetMason Agent Tools

Preview local-first tools for checking and improving ARD / AI Catalog readiness.

AssetMason Agent Tools help developers inspect whether apps, APIs, docs, MCP servers, and workflows expose source-linked machine-readable discovery signals such as `/.well-known/ai-catalog.json`.

## Packages

| Package | Use it for |
|---|---|
| `ard-kit` | Shared schemas, validators, fixtures, and helpers. |
| `ai-discovery` | Validate, explain, and draft `ai-catalog.json` discovery assets. |
| `ard-cli` | Run ARD readiness checks and source-linked diagnostics from the command line. |

## Quickstart

After preview publish:

```bash
npx -y ai-discovery@preview --help
npx -y ard-cli@preview --help
```

Local development:

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

## Examples

```bash
npx -y ai-discovery@preview validate https://example.com/.well-known/ai-catalog.json
npx -y ard-cli@preview scan https://example.com
```

## What these tools do not do

These tools do not certify ARD conformance, guarantee registry indexing, guarantee ranking, guarantee successful agent invocation, provide legal/security/privacy/compliance certification, capture credentials, or send telemetry by default.

## Naming

* npm package / npx command: `ai-discovery`
* spec artifact: `ai-catalog.json`
* feature label: ARD / AI Catalog readiness

## Development

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
npm run pack:dry-run
```

## Security

See [`SECURITY.md`](SECURITY.md).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

MIT.

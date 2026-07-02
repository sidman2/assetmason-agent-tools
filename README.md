# AssetMason Agent Tools

Preview local-first tools for checking and improving ARD / AI Catalog readiness.

AssetMason Agent Tools help developers inspect whether apps, APIs, docs, MCP servers, and workflows expose source-linked machine-readable discovery signals such as `/.well-known/ai-catalog.json`.

## Packages

| Package | Use it for | Preview status |
|---|---|---|
| `ard-kit` | Shared schemas, validators, fixtures, and helpers. | Published as `ard-kit@preview`. |
| `ard-cli` | Run ARD readiness checks and source-linked diagnostics from the command line. | Published as `ard-cli@preview`. |
| `ai-discovery` | Local workspace for validating, explaining, and drafting `ai-catalog.json` discovery assets. | Name blocked on npm; rename/scoped-package decision deferred. |

## Quickstart

Preview CLI:

```bash
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
npx -y ard-cli@preview scan https://example.com
```

## What these tools do not do

These tools do not certify ARD conformance, guarantee registry indexing, guarantee ranking, guarantee successful agent invocation, provide legal/security/privacy/compliance certification, capture credentials, or send telemetry by default.

## Naming

* npm package / npx command: `ard-cli`
* spec artifact: `ai-catalog.json`
* feature label: ARD / AI Catalog readiness

## npm preview status

`ard-kit` and `ard-cli` are published under the `preview` dist-tag.

`ai-discovery` is not currently published under that unscoped name because npm blocked the name as too similar to an existing package. The local workspace remains in the repo while the package name is reconsidered.

Use `ard-cli@preview` for CLI testing.

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

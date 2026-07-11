# AssetMason Agent Tools

Preview local-first tools for checking and improving ARD / AI Catalog readiness alongside the public AssetMason Agent Resource Planning surface.

The public packages provide portable contracts, deterministic artifact builders, validators, scanners, fixtures, and CLI workflows. Proprietary hosted intelligence, private ranking, private graph data, and team workflows are outside this repository.

## Packages

| Package | Use it for | Preview status |
|---|---|---|
| `ard-kit` | Shared schemas, validators, fixtures, and helpers for ARD / AI Catalog readiness. | Existing public preview package. |
| `ard-cli` | Run ARD readiness checks and source-linked diagnostics from the command line. | Existing public preview package. |
| `ai-discovery` | Local workspace for validating, explaining, and drafting `ai-catalog.json` discovery assets. | Existing preview workspace package. |
| `assetmason-resource-plan` | Public-safe resource check, plan, lock, diff, inventory, validation, and Markdown / JSON rendering. | New preview package. |
| `assetmason-cli` | Installed `assetmason` CLI for the public Resource Planning workflow. | New preview package. |

## Quickstart

Preview CLI:

```bash
npx -y assetmason-cli@preview --help
```

Local development:

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

## What these tools do not do

These tools do not certify conformance, guarantee registry indexing, guarantee ranking, guarantee successful agent invocation, provide legal/security/privacy/compliance certification, capture credentials, or send telemetry by default.

## Naming

* ARD / AI Catalog package surface: `ard-kit`, `ard-cli`, `ai-discovery`
* Agent Resource Planning package surface: `assetmason-resource-plan`, `assetmason-cli`
* public artifact families: check, plan, lock, diff, validate, handoff

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

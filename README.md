# AssetMason Agent Tools

Preview local-first tools for checking and improving ARD / AI Catalog readiness alongside the public AssetMason Agent Resource Planning surface.

The public packages provide portable contracts, deterministic artifact builders, validators, scanners, fixtures, and CLI workflows. Proprietary hosted intelligence, private ranking, private graph data, and team workflows are outside this repository.

## Packages

| Package | Use it for | Preview status |
|---|---|---|
| `ard-kit` | Shared schemas, validators, fixtures, and helpers for ARD / AI Catalog readiness. | Existing public preview package. |
| `ard-cli` | Run ARD readiness checks and source-linked diagnostics from the command line. | Existing public preview package. |
| `ai-discovery` | Local workspace for validating, explaining, and drafting `ai-catalog.json` discovery assets. | Existing preview workspace package. |
| `agent-resource-plan` | Public-safe resource check, plan, lock, diff, inventory, validation, and Markdown / JSON rendering. | Ready for npm preview publication; registry publication pending. |
| `assetmason-cli` | Installed `assetmason` CLI for the public Resource Planning workflow. | Ready for npm preview publication; registry publication pending. |

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

The public packages are advisory-only. They do not provide certification, credential custody, runtime execution, or model inference.

Install:

```bash
npm install agent-resource-plan@preview
npm install --save-dev assetmason-cli@preview
```

Public commands:

```bash
npx -y assetmason-cli@preview --help
npx -y assetmason-cli@preview list-scenarios
npx -y assetmason-cli@preview plan --scenario auth-redirect-bug --format json
npx -y assetmason-cli@preview scan --root . --format markdown
```

## Naming

* ARD / AI Catalog package surface: `ard-kit`, `ard-cli`, `ai-discovery`
* Agent Resource Planning package surface: `agent-resource-plan`, `assetmason-cli`
* public artifact families: check, plan, lock, diff, validate, handoff

Preview API note: semantic versioning may change during preview, and private hosted intelligence remains outside this FOSS repository.

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

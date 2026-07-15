# AssetMason Agent Tools

Preview local-first tools for checking and improving ARD / AI Catalog readiness alongside the public AssetMason Agent Resource Planning surface.

The public packages provide portable contracts, deterministic artifact builders, validators, scanners, fixtures, and CLI workflows. Proprietary hosted intelligence, private ranking, private graph data, and team workflows are outside this repository.

## Packages

| Package | Use it for | Preview status |
|---|---|---|
| `ard-kit` | Shared schemas, validators, fixtures, and helpers for ARD / AI Catalog readiness. | Existing public preview package. |
| `ard-cli` | Run ARD readiness checks and source-linked diagnostics from the command line. | Existing public preview package. |
| `ai-discovery` | Local workspace for validating, explaining, and drafting `ai-catalog.json` discovery assets. | Existing preview workspace package. |
| `agent-resource-plan` | Public-safe resource check, selection policy envelope, minimum approved resource set, plan, lock, diff, inventory, validation, and Markdown / JSON rendering. | Publicly available as `0.1.0-preview.2` on the `preview` channel. |
| `assetmason-cli` | Installed `assetmason` CLI for the public Resource Planning workflow, including `select` and selection validation. | Publicly available as `0.1.0-preview.2` on the `preview` channel. |
| `agent-execution-profile` | Public-safe execution-profile contracts, host exports, locks, diffs, and receipt validation. | Publicly available as `0.1.0-preview.2` on the `preview` channel. |

## Quickstart

Public preview CLI:

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

Install from the public preview channel:

```bash
npm install agent-resource-plan@preview
npm install --save-dev assetmason-cli@preview
```

Public npx commands:

```bash
npx -y assetmason-cli@preview --help
npx -y assetmason-cli@preview list-scenarios
npx -y assetmason-cli@preview select --scenario auth-redirect-bug --format json
npx -y assetmason-cli@preview profile --scenario auth-redirect-bug --format json
npx -y assetmason-cli@preview plan --scenario auth-redirect-bug --format json
npx -y assetmason-cli@preview scan --root . --format markdown
```

These commands are available through the published `preview` dist-tag.

## Naming

* ARD / AI Catalog package surface: `ard-kit`, `ard-cli`, `ai-discovery`
* Agent Resource Planning package surface: `agent-resource-plan`, `assetmason-cli`
* public artifact families: check, select, plan, lock, diff, validate, handoff

Preview API note: semantic versioning may change during preview, `preview.2` is a prerelease rather than a stable release, and private hosted intelligence remains outside this FOSS repository. `latest` remains at its actual live registry value.

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

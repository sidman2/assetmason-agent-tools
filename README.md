# AssetMason Agent Tools

Local-first tools for AssetMason delegation preflight, run contracts, evidence reconciliation, and project-owned local runtime workflows.

The public packages provide portable contracts, deterministic artifact builders, validators, scanners, fixtures, CLI workflows, and local runtime mechanics. Proprietary hosted intelligence and later team coordination are outside this repository.

## Packages

| Package | Use it for | Preview status |
|---|---|---|
| `ard-kit` | Shared schemas, validators, fixtures, and helpers for ARD / AI Catalog readiness. | Existing public preview package. |
| `ard-cli` | Run ARD readiness checks and source-linked diagnostics from the command line. | Existing public preview package. |
| `ai-discovery` | Local workspace for validating, explaining, and drafting `ai-catalog.json` discovery assets. | Existing preview workspace package. |
| `agent-resource-plan` | Resource checks, Plan/Lock contracts, Plan Delta/staleness semantics, diffs, inventory, validation, and rendering. | Source-prepared as `0.1.0-preview.5`; verify the live `preview` tag after publishing. |
| `assetmason-cli` | Installed `assetmason` CLI for delegation preflight and local project-owned runtime workflows. | Source-prepared as `0.1.0-preview.5`; this package version includes the merged runtime command surface. |
| `agent-execution-profile` | Execution-profile contracts, host exports, locks, diffs, evidence reconciliation, handoff, and receipt validation. | Source-prepared as `0.1.0-preview.5`; verify the live `preview` tag after publishing. |

## Quickstart

After preview.5 is published:

```bash
npx -y assetmason-cli@preview --help
npx -y assetmason-cli@preview doctor --root . --format json
npx -y assetmason-cli@preview context --root . --task "upgrade a dependency without changing wrapper behavior" --format json
npx -y assetmason-cli@preview check --root . --task "upgrade a dependency without changing wrapper behavior" --format json
```

Local development:

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

## Local runtime preview

The preview.5 CLI package contains the current local runtime mechanics, including project-owned run identity, isolated worktree support, checkpoints, pause/resume, handoff/receipt, scopes, governed decision memory, retry/fork lineage, and worker adapters.

```bash
npx -y assetmason-cli@preview init --root . --format json
npx -y assetmason-cli@preview run --root . --task "bounded local task" --with codex --isolated --format json
npx -y assetmason-cli@preview checkpoint --root . --run <run-id> --format json
npx -y assetmason-cli@preview pause --root . --run <run-id> --format json
npx -y assetmason-cli@preview resume --root . --run <run-id> --format json
npx -y assetmason-cli@preview receipt --root . --run <run-id> --format json
npx -y assetmason-cli@preview handoff --root . --run <run-id> --format json
```

The Codex adapter has deterministic mechanics coverage, but a live real Codex worker launch remains a separate proof requirement. Publication does not establish live-worker, cross-agent, security, production, or launch claims.

## What these tools do not do

These tools do not certify conformance, guarantee registry indexing or ranking, guarantee successful agent invocation, provide legal/security/privacy/compliance certification, capture credentials, or send telemetry by default.

Install from the public preview channel after publishing:

```bash
npm install agent-resource-plan@preview
npm install agent-execution-profile@preview
npm install --save-dev assetmason-cli@preview
```

Execution-profile parity and freshness checks stay advisory for public use: public mode writes its report under ignored `tmp/agent-runs/execution-profile-parity/`, and private parity only runs when `ASSETMASON_PRIVATE_SOURCE_ROOT` and `ASSETMASON_PRIVATE_SOURCE_SHA` are set.

Verification evidence for the public preview surface is captured in `scripts/release-evidence.mjs`, which records the current `verify:public` command chain, package versions, and workflow paths without mutating repository state.

## Naming

* ARD / AI Catalog package surface: `ard-kit`, `ard-cli`, `ai-discovery`
* AssetMason package surface: `agent-resource-plan`, `agent-execution-profile`, `assetmason-cli`
* canonical run-contract roots: `ResourcePlan`, `ResourceLock`, `OutcomeReceipt`

Preview API note: semantic versioning may change during preview. `preview.5` is a prerelease rather than a stable release, and `latest` remains at its actual live registry value.

## Development

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
npm run pack:dry-run
```

## Workflow Example

See [`docs/reconcile-workflow.md`](docs/reconcile-workflow.md) for a reusable reconciliation workflow example, command transcript, exit-code table, and privacy boundary notes.

## Security

See [`SECURITY.md`](SECURITY.md).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

MIT.

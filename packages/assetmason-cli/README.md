# assetmason-cli

Installed CLI for the public AssetMason Agent Resource Planning workflow.

The repository source is ahead of the currently published `assetmason-cli@0.1.0-preview.3` preview package. The published preview surface must not be assumed to contain newer local-runtime commands until a release explicitly includes them.

Use this package when you want the `assetmason` binary from `npx` or a local install.

It stays advisory-only and delegates core planning behavior to `agent-resource-plan` and `agent-execution-profile`.

Install:

```bash
npm install --save-dev assetmason-cli@preview
```

Public npx:

```bash
npx -y assetmason-cli@preview --help
npx -y assetmason-cli@preview doctor --root . --format json
npx -y assetmason-cli@preview context --root . --task "update the CLI" --format json
npx -y assetmason-cli@preview context --root . --task "update the CLI" --diff codex claude-code --format json
npx -y assetmason-cli@preview explain-context --root . --entry packages/assetmason-cli/src/commands.ts --format json
npx -y assetmason-cli@preview check --root . --task "update the CLI" --format json
npx -y assetmason-cli@preview list-scenarios
npx -y assetmason-cli@preview select --scenario auth-redirect-bug --format json
npx -y assetmason-cli@preview profile --scenario auth-redirect-bug --format json
npx -y assetmason-cli@preview export --scenario auth-redirect-bug --format markdown
npx -y assetmason-cli@preview plan --scenario auth-redirect-bug --format json
npx -y assetmason-cli@preview scan --root . --format markdown
```

## Local runtime consumer seam

This section documents the repository-source runtime foundation. These commands are not promised by the currently published npm preview package.

The CLI exposes a file-backed, machine-readable local runtime without requiring a server or account. A consumer should treat the JSON output as the authority and keep `ResourcePlan`, `ResourceLock`, and `OutcomeReceipt` as the only canonical root artifacts.

```bash
assetmason run --root . --task "bounded local task" --isolated --format json
assetmason checkpoint --root . --run <run-id> --format json
assetmason pause --root . --run <run-id> --format json
assetmason resume --root . --run <run-id> --format json
assetmason receipt --root . --run <run-id> --format json
assetmason handoff --root . --run <run-id> --format json
assetmason fork --root . --run <run-id> --task "bounded retry" --format json
assetmason continuation --root . --run <run-id> --format json
assetmason scope init --root . --format json
assetmason memory applicable --root . --format json
assetmason scope export --root . --out ./scope-export.json --format json
assetmason scope delete --root . --confirm --format json
```

Runtime records are stored under `.assetmason/runtime/` and include schema version, stable task/run/workspace identity, append-only event offsets, worktree binding, checkpoint provenance, and an explicit next safe resume action. `adapter` reports capability truth; `generic-command` is not cross-agent support, and an installed worker is never treated as launchable unless its probe succeeds.

Scope records are stored under `.assetmason/scopes/`. Personal, project, and task scopes remain distinct; decision memory is only applicable after explicit acceptance and fresh, conflict-free evidence. Stale or conflicted decisions are surfaced for review and are never silently promoted. The Codex adapter has deterministic mechanics coverage, but live Codex execution and vendor-session restoration remain separately unproven. Set ASSETMASON_CODEX_EXECUTABLE to an independently verified executable path when host discovery is restricted; the launch result must still be recorded.

`scope delete` requires `--confirm` and deletes only the local scope profile; runtime records under `.assetmason/runtime/` are preserved.

The public package is advisory-only and is published with provenance through the trusted GitHub Actions OIDC workflow when the release gate is intentionally run.

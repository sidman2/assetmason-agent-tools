# AssetMason Reconcile Workflow Example

This repository includes a reusable workflow example that runs the public `assetmason` transaction flow against repository-provided artifacts and uploads the rendered result as an artifact.

## Command transcript

```bash
npm ci
npm run build -w agent-resource-plan
npm run build -w agent-execution-profile
npm run build -w assetmason-cli
npm exec --workspace assetmason-cli -- assetmason check --root . --task "prepare transaction artifacts" --out ./plan.json --format json
npm exec --workspace assetmason-cli -- assetmason lock --from-plan ./plan.json --format json
npm exec --workspace assetmason-cli -- assetmason receipt-init --plan ./plan.json --lock ./lock.json --format json
npm exec --workspace assetmason-cli -- assetmason evidence-import --receipt ./receipt.json --import ./import.json --format json
npm exec --workspace assetmason-cli -- assetmason reconcile --plan ./plan.json --lock ./lock.json --receipt ./receipt-with-evidence.json --format json
npm exec --workspace assetmason-cli -- assetmason handoff --plan ./plan.json --lock ./lock.json --receipt ./receipt-with-evidence.json --format json
```

## Exit code table

| Exit code | Meaning |
|---|---|
| `0` | Reconciliation or handoff completed and the artifact was rendered successfully. |
| `1` | Required inputs were missing, invalid, or could not be read. |

## Workflow contract

- Checks out the caller repository.
- Installs dependencies with `npm ci`.
- Builds the public packages needed by the CLI.
- Runs `assetmason lock`, `receipt-init`, `evidence-import`, `reconcile`, and `handoff` against caller-provided artifact paths.
- Uploads the rendered reconciliation and handoff artifacts.
- Does not publish packages, post comments, or fetch private hosted intelligence.

## Privacy boundary

The workflow is repository-consumable and local-first. It does not capture credentials, invoke tools automatically, or claim certification.

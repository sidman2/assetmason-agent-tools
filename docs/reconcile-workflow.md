# AssetMason Reconcile Workflow Example

This repository includes a reusable workflow example that runs the public `assetmason reconcile` command against repository-provided artifacts and uploads the rendered result as an artifact.

## Command transcript

```bash
npm ci
npm run build -w agent-resource-plan
npm run build -w agent-execution-profile
npm run build -w assetmason-cli
npm exec --workspace assetmason-cli -- assetmason reconcile --plan ./resource-plan.json --lock ./resource-lock.json --receipt ./outcome-receipt.json --format json
```

## Exit code table

| Exit code | Meaning |
|---|---|
| `0` | Reconciliation completed and the artifact was rendered successfully. |
| `1` | Required inputs were missing, invalid, or could not be read. |

## Workflow contract

- Checks out the caller repository.
- Installs dependencies with `npm ci`.
- Builds the public packages needed by the CLI.
- Runs `assetmason reconcile` against caller-provided artifact paths.
- Uploads the rendered reconciliation artifact.
- Does not publish packages, post comments, or fetch private hosted intelligence.

## Privacy boundary

The workflow is repository-consumable and local-first. It does not capture credentials, invoke tools automatically, or claim certification.

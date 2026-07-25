# assetmason-cli

Installed CLI for the public AssetMason Agent Resource Planning workflow.

Source-prepared as `assetmason-cli@0.1.0-preview.3`. The live `preview` channel currently resolves to `assetmason-cli@0.1.0-preview.2`.

Use this package when you want the `assetmason` binary from `npx` or a local install.

It stays advisory-only and delegates all semantic behavior to `agent-resource-plan`.

Install:

```bash
npm install --save-dev assetmason-cli@preview
```

Public npx:

```bash
npx -y assetmason-cli@preview --help
npx -y assetmason-cli@preview list-scenarios
npx -y assetmason-cli@preview select --scenario auth-redirect-bug --format json
npx -y assetmason-cli@preview profile --scenario auth-redirect-bug --format json
npx -y assetmason-cli@preview export --scenario auth-redirect-bug --format markdown
npx -y assetmason-cli@preview plan --scenario auth-redirect-bug --format json
npx -y assetmason-cli@preview scan --root . --format markdown
```

The public package is advisory-only and is published with provenance through the trusted GitHub Actions OIDC workflow when the release gate is intentionally run.

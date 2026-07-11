# assetmason-cli

Installed CLI for the public AssetMason Agent Resource Planning workflow.

Ready for npm preview publication; registry publication pending.

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
npx -y assetmason-cli@preview plan --scenario auth-redirect-bug --format json
npx -y assetmason-cli@preview scan --root . --format markdown
```

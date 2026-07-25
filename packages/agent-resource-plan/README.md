# agent-resource-plan

Portable, advisory-only contracts and deterministic builders for the public AssetMason Agent Resource Planning surface.

Source-prepared as `agent-resource-plan@0.1.0-preview.3`. The live `preview` channel currently resolves to `agent-resource-plan@0.1.0-preview.2`.

This library provides public-safe artifact contracts for:

- Before-Build resource checks
- selection policy envelopes
- minimum approved resource sets
- minimum toolset evaluation
- selection policy envelopes
- resource plans
- resource locks
- resource diffs
- resource inventories
- validation results
- JSON and Markdown rendering

It is local-first, execution-free, credential-free, secret-safe, and designed to be used directly from Node or through the companion CLI.

The public package is published with provenance via the trusted GitHub Actions OIDC workflow when the release gate is intentionally run.

Install:

```bash
npm install agent-resource-plan@preview
```

Common entry points:

```bash
npx -y assetmason-cli@preview select --scenario auth-redirect-bug --format json
npx -y assetmason-cli@preview validate --file selection.json --kind minimum-approved-resource-set
```

# agent-execution-profile

Deterministic advisory execution-profile contracts, builders, validators, renderers, and static host exports for AssetMason.

This package is public-safe and execution-free. It does not run tools, proxy inference, hold credentials, or enforce runtime behavior on a host.

Publicly available as `agent-execution-profile@0.1.0-preview.2` on the `preview` channel with provenance from the trusted GitHub Actions OIDC workflow.

It covers:

- execution profiles
- execution profile locks
- execution profile diffs
- generic, Codex, and Claude Code host exports
- outcome receipt validation and rendering

Install:

```bash
npm install agent-execution-profile@preview
```

Common usage:

```bash
npx -y assetmason-cli@preview profile --scenario auth-redirect-bug --format json
npx -y assetmason-cli@preview profile-lock --scenario auth-redirect-bug --format json
npx -y assetmason-cli@preview export --scenario auth-redirect-bug --format markdown
```

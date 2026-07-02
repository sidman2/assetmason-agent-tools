# Preview publish checklist

Maintainer-only checklist for npm preview publishing.

## Published / target packages

| Package | npm status |
|---|---|
| `ard-kit` | Published as `ard-kit@0.1.0-preview.0`. |
| `ard-cli` | Publish as `ard-cli@0.1.0-preview.1` after the runtime dependency fix. |
| `ai-discovery` | Do not publish unscoped; npm blocked the name as too similar to `aidiscovery`. Rename or scope decision deferred. |

## Commands

```bash
npm login
npm whoami

npm publish --tag preview --workspace ard-kit
npm publish --tag preview --workspace ard-cli
```

Do not retry `ai-discovery` as an unscoped publish target.

## ard-cli preview.1 fix

`ard-cli@0.1.0-preview.0` was published with a local `file:../ard-kit` dependency and fails when installed from npm. The fix is `ard-cli@0.1.0-preview.1`, which depends on `ard-kit@0.1.0-preview.0` from the registry.

Manual publish after this commit:

```powershell
npm publish --tag preview --workspace ard-cli
npm dist-tag add ard-cli@0.1.0-preview.1 preview
npm dist-tag add ard-cli@0.1.0-preview.1 latest
```

Do not republish `0.1.0-preview.0`.

## Verification

```bash
npm view ard-kit version dist-tags --json
npm view ard-cli version dist-tags --json

npx -y ard-cli@preview --help
```

## Deferred naming options for ai-discovery

Options to evaluate later:

- scoped package such as `@manchanda/ai-discovery` using `npm publish --access public`
- AssetMason organization scope if an npm org is created
- a different unscoped name that passes npm’s similarity checks

Do not make this decision in this pass.

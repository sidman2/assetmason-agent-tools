# Preview publish checklist

Maintainer-only checklist for npm preview publishing.

## Published / target packages

| Package | npm status |
|---|---|
| `ard-kit` | Published as `ard-kit@preview`. |
| `ard-cli` | Published as `ard-cli@preview`. |
| `ai-discovery` | Do not publish unscoped; npm blocked the name as too similar to `aidiscovery`. Rename or scope decision deferred. |

## Commands

```bash
npm login
npm whoami

npm publish --tag preview --workspace ard-kit
npm publish --tag preview --workspace ard-cli
```

Do not retry `ai-discovery` as an unscoped publish target.

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

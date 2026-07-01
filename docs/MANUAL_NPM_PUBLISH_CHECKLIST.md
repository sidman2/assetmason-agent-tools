# Manual NPM Publish Checklist

Use this checklist only when a human is ready to decide on publish. Do not paste npm tokens into the IDE.

## Prerelease publish

For version `0.1.0-preview.0`, publish manually with `--tag preview`.
Do not publish prerelease packages under the default `latest` tag.
Manual release is not yet performed.
Actual npm publish must be done by the user from a clean `main` checkout.
Use `--tag preview` for `0.1.0-preview.0`.
Do not publish prerelease packages under `latest`.
Make GitHub repo public before or shortly after npm publish so users can inspect source/docs.
For background on the emerging Agentic Resource Discovery protocol, see the external ARD specification reference at https://agenticresourcediscovery.org/.

## Before publish

1. Run `npm login` in a trusted terminal.
2. Run `npm whoami` and confirm the expected account.
3. Verify 2FA requirements for the account and package scope.
4. Run `npm publish --dry-run --tag preview --workspace ard-kit`.
5. Run `npm publish --dry-run --tag preview --workspace ard-cli`.
6. Run `npm publish --dry-run --tag preview --workspace ai-discovery`.

## Publish later, manually only

1. Publish `ard-kit` only if the dry run looks correct.
2. Publish `ard-cli` only if the dry run looks correct.
3. Publish `ai-discovery` only if the dry run looks correct.
4. If trusted publishing is adopted later, evaluate it separately. It is not required for this review pass.

Manual-only publish commands:

```bash
npm publish --tag preview --workspace ard-kit
npm publish --tag preview --workspace ard-cli
npm publish --tag preview --workspace ai-discovery
```

Post-publish verification:

```bash
npm view ard-kit version dist-tags --json
npm view ard-cli version dist-tags --json
npm view ai-discovery version dist-tags --json
```

Manual publish order recommended:

1. `ard-kit`
2. `ai-discovery`
3. `ard-cli`

## After publish

1. Verify the package pages on npm.
2. Confirm the expected versions and package contents.
3. Check that no secrets, tokens, or local paths were included.

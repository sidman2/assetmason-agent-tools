# Manual NPM Publish Checklist

Use this checklist only when a human is ready to decide on publish. Do not paste npm tokens into the IDE.

## Before publish

1. Run `npm login` in a trusted terminal.
2. Run `npm whoami` and confirm the expected account.
3. Verify 2FA requirements for the account and package scope.
4. Run `npm publish --dry-run --workspace ard-kit`.
5. Run `npm publish --dry-run --workspace ard-cli`.
6. Run `npm publish --dry-run --workspace ai-catalog`.

## Publish later, manually only

1. Publish `ard-kit` only if the dry run looks correct.
2. Publish `ard-cli` only if the dry run looks correct.
3. Publish `ai-catalog` only if the dry run looks correct.
4. If trusted publishing is adopted later, evaluate it separately. It is not required for this review pass.

## After publish

1. Verify the package pages on npm.
2. Confirm the expected versions and package contents.
3. Check that no secrets, tokens, or local paths were included.


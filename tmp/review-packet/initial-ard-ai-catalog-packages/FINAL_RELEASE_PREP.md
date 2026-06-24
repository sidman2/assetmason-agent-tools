# Final Release Prep

Manual release is not yet performed.
Actual npm publish must be done by the user from a clean `main` checkout.
Use `--tag preview` for `0.1.0-preview.0`.
Do not publish prerelease packages under `latest`.
Make GitHub repo public before or shortly after npm publish so users can inspect source/docs.

Manual-only publish commands:

```bash
npm login
npm whoami
npm publish --tag preview --workspace ard-kit
npm publish --tag preview --workspace ai-catalog
npm publish --tag preview --workspace ard-cli
```

Post-publish verification:

```bash
npm view ard-kit version dist-tags --json
npm view ai-catalog version dist-tags --json
npm view ard-cli version dist-tags --json
```

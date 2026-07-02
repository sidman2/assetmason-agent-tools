# Preview publish checklist

Maintainer-only checklist for manual npm preview publishing.

Publishing is manual and interactive because npm may require login, 2FA, or OTP confirmation.

## Expected package version

```text
0.1.0-preview.0
```

## Publish tag

```text
preview
```

## Packages to publish

```text
ard-kit
ai-discovery
ard-cli
```

Do not publish `ai-catalog`.

Do not publish under `latest`.

## Commands

```bash
npm login
npm whoami

npm publish --tag preview --workspace ard-kit
npm publish --tag preview --workspace ai-discovery
npm publish --tag preview --workspace ard-cli
```

## Verification

```bash
npm view ard-kit version dist-tags --json
npm view ai-discovery version dist-tags --json
npm view ard-cli version dist-tags --json

npx -y ai-discovery@preview --help
npx -y ard-cli@preview --help
```

## Rules

* Do not store npm credentials, tokens, OTPs, or recovery codes.
* Do not publish `ai-catalog`.
* Do not publish under `latest`.
* Do not publish from IDE/Codex/agent environments unless explicitly authorized later.

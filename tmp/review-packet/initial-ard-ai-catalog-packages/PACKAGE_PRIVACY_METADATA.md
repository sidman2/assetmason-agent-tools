# Package Privacy Metadata

## Root

- `package.json` private value: `true`
- Root workspace private state: private
- GitHub repo visibility changed: no
- npm publish happened: no
- npm credentials stored: no
- These states were re-read after the docs-link commit and before `main` was created.

## `packages/ard-kit/package.json`

- version: `0.1.0-preview.0`
- private value: absent
- publishable from package metadata: yes
- bin value: absent

## `packages/ai-catalog/package.json`

- version: `0.1.0-preview.0`
- private value: absent
- publishable from package metadata: yes
- bin value: `{ "ai-catalog": "bin/ai-catalog.js" }`

## `packages/ard-cli/package.json`

- version: `0.1.0-preview.0`
- private value: absent
- publishable from package metadata: yes
- bin value: `{ "ard-cli": "bin/ard-cli.js" }`

## Publishability State

- Root workspace remains private.
- Publishable workspace packages are not marked `private: true`.
- No registry credentials, tokens, passwords, recovery codes, or personal email were stored.
- `npm publish --dry-run --tag preview` succeeded for `ard-kit`, `ard-cli`, and `ai-catalog`.
- No package names were changed.
- No package version changes were required.

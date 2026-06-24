# Risk and Boundary Review

- No actual npm publish happened.
- No GitHub release was created.
- No GitHub repo visibility change was made.
- No npm token, password, recovery code, or personal credential was stored.
- Root workspace remains private.
- Publishable workspace packages are not marked private.
- Preview packages require `--tag preview` when manually published.
- CLI bin metadata is explicit and packed tarballs preserve bin entries.
- External ARD reference link is informational only and does not claim affiliation, certification, ranking, indexing, registry acceptance, or invocation guarantee.
- No certification/safety/compliance/ranking/indexing/invocation guarantee was added.

## Additional boundary notes

- `npm publish --dry-run --tag preview` was attempted only as a dry-run and succeeded for all three workspace packages.
- The local `package-lock.json` was cleaned during prep and is not intended to be committed.
- npm did not emit the `bin` normalization warning during dry-run for `ard-cli` and `ai-catalog`.

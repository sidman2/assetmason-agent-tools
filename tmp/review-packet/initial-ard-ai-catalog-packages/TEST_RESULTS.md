# Test Results

Ran successfully:

- `npm install`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run pack:dry-run`
- `npm run names:check`
- `node -e "for (const p of ['package.json','packages/ard-kit/package.json','packages/ai-catalog/package.json','packages/ard-cli/package.json']) { const j=require('./'+p); console.log(p, JSON.stringify({name:j.name, version:j.version, private:j.private, publishConfig:j.publishConfig || null})) }"`

Notes:

- `npm publish --dry-run --workspace ard-kit` failed with `npm error You must specify a tag using --tag when publishing a prerelease version.`
- `npm publish --dry-run --workspace ai-catalog` failed with the same prerelease tag requirement, plus npm warned it would remove the invalid bin entry during publish normalization.
- `npm publish --dry-run --workspace ard-cli` failed with the same prerelease tag requirement, plus npm warned it would remove the invalid bin entry during publish normalization.
- `package-lock.json` was generated locally by `npm install` and remains untracked.

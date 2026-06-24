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
- `npm publish --dry-run --tag preview --workspace ard-kit`
- `npm publish --dry-run --tag preview --workspace ai-catalog`
- `npm publish --dry-run --tag preview --workspace ard-cli`

Notes:

- `npm publish --dry-run --tag preview --workspace ard-kit` succeeded.
- `npm publish --dry-run --tag preview --workspace ai-catalog` succeeded, plus npm warned it would remove the invalid bin entry during publish normalization.
- `npm publish --dry-run --tag preview --workspace ard-cli` succeeded, plus npm warned it would remove the invalid bin entry during publish normalization.
- npm also printed `This command requires you to be logged in to https://registry.npmjs.org/ (dry-run)`.
- `package-lock.json` was generated locally by `npm install` and remains untracked.

# Contributing

AssetMason Agent Tools are preview, solo-maintained developer tools.

## Helpful contributions

Useful contributions include:

- bug reports;
- documentation fixes;
- reproducible CLI issues;
- schema or validator fixtures;
- small focused pull requests.

## Before opening a pull request

Run:

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

## Boundaries

Please do not open pull requests that:

* add new packages without maintainer approval;
* add `ai-catalog` as a package or command;
* add telemetry;
* capture credentials;
* claim certification, guaranteed indexing, ranking, registry acceptance, or agent invocation;
* add website/web-app routes, headers, middleware, or API endpoints.

## Security issues

Use `SECURITY.md` for security reports.

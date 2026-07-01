# NPM Name Checks

- `ai-discovery`: E404 / not found / available
- `ai-catalog`: exists and is owned by `fernforge <fernforgehq@gmail.com>`
- `ard-kit`: E404 / not found / available
- `ard-cli`: E404 / not found / available
- `npm whoami`: not run during this pass; no npm credentials were requested or stored

Notes:

- `npm owner ls ai-discovery` returned E404, which is consistent with the package being unpublished.
- `npm owner ls ai-catalog` returned `fernforge <fernforgehq@gmail.com>`.

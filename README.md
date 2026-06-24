# AssetMason Agent Tools

Preview ARD / AI Catalog tooling for making public app, API, docs, and workflow resources more discoverable to agents.

These packages help inspect and generate readiness signals. They do not certify safety, compliance, ranking, indexing, or successful agent invocation.

## Quickstart

```bash
npx ard-cli check ./.well-known/ai-catalog.json
npx ard-cli scan https://example.com
npx ai-catalog validate ./.well-known/ai-catalog.json
npx ai-catalog explain
```

## Packages

| Package | Purpose |
| --- | --- |
| `ard-kit` | shared schemas, validators, fixtures, and helper types |
| `ard-cli` | umbrella local CLI for ARD / AI Catalog scan and check workflows |
| `ai-catalog` | focused validator/explainer/generator for `ai-catalog.json` |

## Not included yet

`ard-mcp`, `ard-scan`, and `ard-check` are planned later packages. They are not published or scaffolded as empty placeholders in this pass.

## External reference

For background on the emerging Agentic Resource Discovery protocol, see the external ARD specification reference at https://agenticresourcediscovery.org/.

AssetMason Agent Tools are preview readiness helpers and are not an official conformance authority for ARD or AI Catalog.

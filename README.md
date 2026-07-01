# AssetMason Agent Tools

Preview ARD / AI Catalog tooling for making public app, API, docs, and workflow resources more discoverable to agents.

These packages are preview developer tools for inspecting and improving ARD / AI Catalog readiness. They do not certify ARD conformance, guarantee registry indexing, guarantee invocation success, or provide security/compliance certification.

## Quickstart

```bash
npx ard-cli check ./.well-known/ai-catalog.json
npx ard-cli scan https://example.com
npx ai-discovery validate ./.well-known/ai-catalog.json
npx ai-discovery explain
```

## Packages

| Package | Purpose |
| --- | --- |
| `ard-kit` | shared schemas, validators, fixtures, and helper types |
| `ard-cli` | umbrella local CLI for ARD / AI Catalog scan and check workflows |
| `ai-discovery` | focused validator/explainer/generator for `ai-catalog.json` and `/.well-known/ai-catalog.json` |

## Not included yet

`ard-mcp`, `ard-scan`, and `ard-check` are planned later packages. They are not published or scaffolded as empty placeholders in this pass.

## External reference

For background on the emerging Agentic Resource Discovery protocol, see the external ARD specification reference at https://agenticresourcediscovery.org/.

AssetMason Agent Tools are preview readiness helpers and are not an official conformance authority for ARD or AI Catalog.

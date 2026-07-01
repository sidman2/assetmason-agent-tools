# ai-discovery

`ai-discovery` validates and explains AI Catalog / ARD discovery assets such as `/.well-known/ai-catalog.json`.

## Status

Preview package. It helps generate and validate readiness signals and does not certify safety, compliance, ranking, indexing, or successful invocation.

These packages are preview developer tools for inspecting and improving ARD / AI Catalog readiness. They do not certify ARD conformance, guarantee registry indexing, guarantee invocation success, or provide security/compliance certification.

## Install and use

```bash
npx ai-discovery validate ./.well-known/ai-catalog.json
npx ai-discovery explain
npx ai-discovery generate --url https://example.com --out ./ai-catalog.draft.json
```

## Boundary

- No telemetry
- No credential capture
- JSON output is parseable JSON only
- Local-first unless a URL is explicitly supplied
- `ai-discovery` validates and explains AI Catalog / ARD discovery assets such as `/.well-known/ai-catalog.json`
- For background on the emerging Agentic Resource Discovery protocol, see the external ARD specification reference at https://agenticresourcediscovery.org/.

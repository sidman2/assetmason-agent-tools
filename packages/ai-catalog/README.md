# ai-catalog

Focused validator, explainer, and generator for `ai-catalog.json`.

## Status

Preview package. It helps generate and validate readiness signals and does not certify safety, compliance, ranking, indexing, or successful invocation.

## Install and use

```bash
npx ai-catalog validate ./.well-known/ai-catalog.json
npx ai-catalog explain
npx ai-catalog generate --url https://example.com --out ./ai-catalog.draft.json
```

## Boundary

- No telemetry
- No credential capture
- JSON output is parseable JSON only
- For background on the emerging Agentic Resource Discovery protocol, see the external ARD specification reference at https://agenticresourcediscovery.org/.

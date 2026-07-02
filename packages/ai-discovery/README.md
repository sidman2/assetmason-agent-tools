# ai-discovery

`ai-discovery` validates and explains AI Catalog / ARD discovery assets such as `/.well-known/ai-catalog.json`.

`ai-discovery` remains deferred under the unscoped name; its published package decision is separate from the `ard-cli@0.1.0-preview.1` fix.

## Status

Preview package. It helps generate and validate readiness signals and does not certify safety, compliance, ranking, indexing, or successful invocation.

These packages are preview developer tools for inspecting and improving ARD / AI Catalog readiness. They do not certify ARD conformance, guarantee registry indexing, guarantee invocation success, or provide security/compliance certification.

## Install and use

```bash
npx ard-cli check ./.well-known/ai-catalog.json
npx ard-cli scan https://example.com
npx ard-cli explain
```

## Boundary

- No telemetry
- No credential capture
- JSON output is parseable JSON only
- Local-first unless a URL is explicitly supplied
- `ai-discovery` remains a local workspace while the npm package name is under review; use `ard-cli` for published CLI testing
- For background on the emerging Agentic Resource Discovery protocol, see the external ARD specification reference at https://agenticresourcediscovery.org/.

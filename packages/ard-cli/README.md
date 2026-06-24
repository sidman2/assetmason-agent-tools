# ard-cli

Umbrella local CLI for ARD / AI Catalog scan and check workflows.

## Status

Preview package. It helps inspect readiness signals and does not certify safety, compliance, ranking, indexing, or successful invocation.

## Install and use

```bash
npx ard-cli check ./.well-known/ai-catalog.json
npx ard-cli scan https://example.com
npx ard-cli check ./.well-known/ai-catalog.json --json
```

## Boundary

- No telemetry
- No credential capture
- JSON output is parseable JSON only
- Local fixture examples are deterministic
- For background on the emerging Agentic Resource Discovery protocol, see the external ARD specification reference at https://agenticresourcediscovery.org/.

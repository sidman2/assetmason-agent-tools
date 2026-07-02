# ard-cli

Umbrella local CLI for ARD / AI Catalog scan and check workflows.

## Status

Preview package. It helps inspect readiness signals and does not certify safety, compliance, ranking, indexing, or successful invocation.

`ard-cli@0.1.0-preview.1` is the fixed preview release that depends on `ard-kit@0.1.0-preview.0` from the registry rather than a local file path.

These packages are preview developer tools for inspecting and improving ARD / AI Catalog readiness. They do not certify ARD conformance, guarantee registry indexing, guarantee invocation success, or provide security/compliance certification.

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
- `ard-cli` is the umbrella CLI for ARD readiness checks and source-linked discovery diagnostics.
- For background on the emerging Agentic Resource Discovery protocol, see the external ARD specification reference at https://agenticresourcediscovery.org/.

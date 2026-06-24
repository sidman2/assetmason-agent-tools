# ard-kit

Shared schemas, validators, fixtures, and helper types for preview ARD / AI Catalog work.

## Status

Preview package. This is a readiness helper, not an official spec or certification authority.

## Install and use

```ts
import { validateAiCatalog } from "ard-kit";
```

## Boundary

- No telemetry
- No credential capture
- No safety, compliance, ranking, indexing, or invocation certification
- JSON results are plain data and remain serializable
- For background on the emerging Agentic Resource Discovery protocol, see the external ARD specification reference at https://agenticresourcediscovery.org/.

## Local example

```ts
import { validBasicAiCatalog } from "../../fixtures/ai-catalog/valid-basic.ai-catalog.json";
```

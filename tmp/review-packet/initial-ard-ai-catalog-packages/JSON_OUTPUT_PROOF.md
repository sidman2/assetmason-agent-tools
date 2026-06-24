# JSON Output Proof

- `ard-cli check ... --json` returned a single JSON object and parsed cleanly.
- `ard-cli scan ... --json` returned a single JSON object and parsed cleanly.
- `ai-catalog validate ... --json` returned a single JSON object and parsed cleanly.
- Human-readable command variants still produce JSON-formatted output, but the `--json` flag keeps machine output free of prose.


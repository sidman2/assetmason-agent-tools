# AssetMason launch evidence

Date: 2026-08-12  
Exact AssetMason head for the original beta evidence: `45ad056acc91f2cc4c22056da70b1e906bf73e11`

## Continuation checkpoint

Current implementation head `2db3533` includes the project-owned Codex adapter boundary, governed scopes/memory, worker-neutral continuation, bounded local init/delete, and deterministic injected-process coverage. The installed Windows Codex host was probed once afterward and classified `LIVE_CODEX_HOST_BLOCKED` (`EPERM`); this is not live worker proof. Current capability details are tracked in [`capability-ledger-v10205.md`](capability-ledger-v10205.md).

The preceding draft PR checkpoint `df686346` passed the repository CI matrix across Ubuntu, macOS, and Windows for Node 18, 20, and 22. This is exact-head repository verification for that checkpoint, not live worker or deployment proof.

## Validation corpus

The environment exposed four separate brownfield repositories with task-shaped source prompts or documented follow-up work. The harness ran `doctor`, `context`, and `check` against each repository without mutating them. One deterministic fixture was run separately and is not included in the real-task denominator.

| Metric | Result |
|---|---:|
| Real tasks | 4 |
| Fixtures | 1 |
| Useful source-linked findings | 4 / 4 |
| Material corrections | 0 / 4 |
| Material confirmations | 4 / 4 |
| No-addition successes | 0 / 4 |
| False blocks | 0 / 4 |
| Missed material facts | 0 / 4 |
| Unsupported claims | 0 / 4 |
| Actionable run plans | 4 / 4 |
| Median doctor/context/check latency | 9.1s |
| P90 doctor/context/check latency | 15.1s (nearest-rank) |

The requested 20–30 real-task denominator was not available in this environment. The shortfall is explicit: 4 legitimate real tasks were run, not 20 fabricated tasks. Raw JSONL records are generated at `tmp/launch-validation.jsonl` during validation and are intentionally ignored runtime evidence.

## Runtime proof

The generic CLI dogfood passed from user-facing boundaries: disposable Git fixture, `doctor`, `context`, `check`, isolated run, generic process execution with PID/exit observation, checkpoint, pause, fresh-process resume, explicit stop, conservative receipt, and handoff. The receipt remained non-complete because the worker outcome was not observed. Stopped and completed states remained distinct.

This does not prove a live Codex worker. The installed WindowsApps Codex binary remains blocked by host execution denial. The Project Harness and cross-agent claims remain unearned.

## Verdict

`BETA_READY_WITH_EXPLICIT_LIMITATIONS`

This verdict applies only to the narrow preflight/local-runtime beta. It does not authorize or imply Project Harness, cross-agent, production-ready, secure, compliant, or autonomous claims.

Limitations:

- real-task corpus is 4 rather than the requested 20–30;
- live Codex launch proof is unavailable;
- generic runtime receipts remain conservative when worker outcome is unobserved;
- no package publication or deployment was performed.

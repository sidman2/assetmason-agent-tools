# AssetMason capability ledger — current checkpoint

Evidence is bound to repository head `7ff262e`. `TESTED` means a focused deterministic check passed; `LIVE_PROVEN` requires an observed external worker or end-to-end run. Capability discovery is not adapter proof.

| Capability | Implemented | Tested | Live-proven | Claimable | Evidence / gap |
|---|---|---|---|---|---|
| doctor / context / check | yes | yes | no | preflight beta | `packages/assetmason-cli/src/commands.ts`; existing launch evidence |
| ResourcePlan | yes | yes | no | yes | `agent-resource-plan` tests |
| ResourceLock | yes | yes | no | yes | `agent-resource-plan` tests |
| OutcomeReceipt | yes | yes | no | runtime receipt with limitations | `local-runtime.ts`, CLI tests |
| staleness / PlanDelta | yes | yes | no | yes | execution-profile reconciliation tests |
| evidence authority | yes | yes | no | advisory | receipt/reconciliation contracts |
| RunRecord / EventLog | yes | yes | no | generic runtime | `local-runtime.ts`, CLI tests |
| CheckpointRecord | yes | yes | no | generic runtime | checkpoint lifecycle tests |
| isolated workspace | yes | yes | no | generic runtime | retained worktree test |
| generic runner | yes | yes | yes for generic process only | generic runtime | generic dogfood evidence |
| Codex adapter | yes | yes (injected process) | no | adapter mechanics only | `runCodexCommand`; live host returns `LIVE_CODEX_HOST_BLOCKED` |
| pause / stop | yes | partial | no | generic stop semantics | stop termination now uses persisted process identity across CLI invocations; bounded async test hangs |
| fresh-process continuation | yes | yes for generic lifecycle | no | generic continuation | resume/checkpoint tests |
| HandoffPack / runtime receipt | yes | yes | no | conservative runtime handoff | CLI tests |
| validation harness | yes | yes for existing corpus and CI replay | no | 20-real-task beta evidence | `scripts/validation-harness.mjs`, exact-head CI artifact |
| PersonalScope | yes | yes (smoke) | no | local foundation | `.assetmason/scopes/scope-state.json` |
| ProjectScope | yes | yes (smoke) | no | local foundation | project head and discovered instructions |
| TaskScope | yes | yes (smoke) | no | local foundation | run-created task linkage |
| DecisionMemoryLedger | partial | yes (repeat-task smoke) | no | governed local foundation | `memory applicable` returns fresh accepted decisions and surfaces stale/conflicted decisions; broader retention value not proven |
| freshness / conflict surfacing | yes | yes (smoke) | no | local foundation | repository-head drift marks accepted memory stale |
| local scope export | yes | yes (CLI smoke) | no | local foundation | `scope export` |
| local scope delete | yes | yes (CLI smoke) | no | guarded local foundation | `scope delete --confirm` preserves runtime records |
| attempt / fork lineage | yes | yes (smoke) | no | local retry/fork mechanics only | explicit `fork` preserves TaskScope identity and parent RunRecord; worker-neutral continuation remains unearned |
| second worker adapter | no | no | no | not claimable | no second real adapter selected |
| worker-neutral continuation pack | yes | yes (smoke) | no | local continuation contract only | explicit unsupported vendor-session and cross-agent fields |
| historical replay corpus | yes | yes (20 REAL_TASK CI replay) | no | 20-real-task beta gate | exact-head CI artifact: 20 records, 20 useful source-linked findings, 20 actionable plans, 0 errors |

## Claims not earned

- Project Harness / true live Codex worker.
- Cross-agent continuation.
- broader retention-quality metrics beyond source-linked findings and actionable plans.
- Production-ready, secure, compliant, autonomous, or hosted-runtime claims.

## Verification boundary at this checkpoint

- Repository typecheck and full workspace build passed.
- Generated-source guard passed.
- Draft PR #33 exact-head CI passed on Ubuntu, macOS, and Windows for Node 18, 20, and 22.
- `names:check` is not green because the environment attempted to resolve unpublished `ai-discovery` from npm and received `E404`; this is not treated as a code pass.
- Full Vitest execution remains environment-blocked by worker hangs.

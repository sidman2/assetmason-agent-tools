# External Codex proof procedure

Status: `CODEX_ADAPTER_IMPLEMENTED_LIVE_PROOF_PENDING`

This packet is intentionally for execution outside the IDE host. The current Node host may be unable to discover or launch WindowsApps Codex binaries; preserve the exact probe result and do not infer live proof from PowerShell resolution. Do not treat `assetmason adapter --with codex` capability reporting as live worker proof.

## Procedure

Run from a clean checkout of the exact commit under test:

1. Verify the external environment first: `codex --help` must succeed.
2. Verify the AssetMason commit and version: `git rev-parse HEAD`, `node packages/assetmason-cli/bin/assetmason.js --help`.
3. Create a disposable Git fixture with one bounded source change.
4. Run `doctor`, `context`, `check`, and `lock` and preserve their JSON output.
5. Create an isolated run with `run --isolated`.
6. Launch Codex through an implemented AssetMason adapter. The repository implements the project-owned launch adapter; record the adapter result and distinguish host denial from a successful live worker.
7. Make exactly one bounded source change through the adapter and capture stdout, stderr, PID, exit, and signal observations.
8. Create a checkpoint, then pause or stop the run; if the host denies launch, preserve the denial evidence and stop the procedure.
9. Terminate the controller process and start a fresh controller process.
10. Resume, execute the next bounded step, and preserve the append-only event history.
11. Generate `handoff --root ... --run ...` and `receipt --root ... --run ...`.
12. Confirm the receipt is conservative, the handoff contains the exact next action, the isolated worktree is retained, and no non-idempotent effect was duplicated.

## Required artifacts

Preserve the exact commit, commands, timestamps, JSON outputs, controller logs, event log, checkpoint, isolated worktree identity, handoff, and outcome receipt. A successful capability probe without an observed worker launch is not live proof and does not earn the Project Harness claim.

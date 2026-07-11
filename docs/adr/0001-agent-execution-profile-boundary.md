# ADR 0001: Reserve the future `agent-execution-profile` boundary

## Status

Proposed

## Context

AssetMason Agent Tools currently publishes the public `agent-resource-plan` contracts and the branded `assetmason-cli` consumer. The future execution-profile surface must remain separate until the upstream private work stabilizes and the public/private boundary is reviewed.

## Decision

Do not create or publish an empty placeholder package for `agent-execution-profile` yet.

When the boundary is ready, `agent-execution-profile` will own:

- execution profile contracts;
- role cards;
- capability requirements;
- policy precedence;
- effective policy;
- profile lock and diff artifacts;
- structured host-export contracts;
- Outcome Receipt contract.

## Exclusions

The future package must not include:

- inference;
- model gateway behavior;
- credentials;
- tool execution;
- private graph data;
- proprietary ranking;
- hosted decision history.

## Preconditions

Implementation must wait for:

1. Agentify PR #21 to merge;
2. final contract stabilization;
3. public/private boundary review;
4. public-safe extraction;
5. independent tests.

## Consequences

This keeps the public package surface narrow and avoids reserving or publishing a package that would need to be broken apart later.

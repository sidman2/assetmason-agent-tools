import { describe, expect, it } from "vitest";
import { buildExecutionProfile } from "../src/build.js";
import { buildExecutionProfileLock } from "../src/lock.js";
import { buildCodexHostExportArtifact, buildClaudeCodeHostExportArtifact, buildGenericHostExportArtifact, renderOutcomeReceiptMarkdown } from "../src/index.js";

const cases = [
  {
    name: "auth-redirect-bug",
    input: {
      task_or_intent: "auth redirect bug",
      task_class: "small_fix",
      host_context: "codex",
      policy_layers: [
        {
          layer: "task_envelope",
          summary: "Public-safe advisory-only task envelope",
          preferences: {
            preferred_resources: ["repo_source"],
            capability_requirements: ["tool_use", "test_iteration"]
          },
          unknowns: ["private runtime state"]
        }
      ],
      review_notes: ["advisory only"],
      host_export_target: "generic" as const
    },
    expected: {
      profile_id: "206ccd85f8072306",
      profile_digest: "b8f43d0ba1f3d6054652543401f028fef9015fec38fa9b851addae5333ae47df",
      lock_digest: "b8f43d0ba1f3d6054652543401f028fef9015fec38fa9b851addae5333ae47df",
      generic_export_host: "generic",
      codex_export_host: "codex",
      claude_export_host: "claude-code",
      receipt_roles: ["implementer"]
    }
  },
  {
    name: "architecture-sensitive-feature",
    input: {
      task_or_intent: "architecture sensitive feature",
      task_class: "architecture_sensitive",
      host_context: "codex",
      policy_layers: [
        {
          layer: "task_envelope",
          summary: "Public-safe advisory-only task envelope",
          preferences: {
            preferred_resources: ["repo_source", "design_docs"],
            capability_requirements: ["architecture_judgment", "deep_reasoning"]
          },
          unknowns: ["private runtime state"]
        }
      ],
      review_notes: ["advisory only"],
      host_export_target: "generic" as const
    },
    expected: {
      profile_id: "ad066f0982bde699",
      profile_digest: "5ee71a1ebd08b03319d5d69a756b4fe1c2890c255d2b71a81549eea0b594e7e0",
      lock_digest: "5ee71a1ebd08b03319d5d69a756b4fe1c2890c255d2b71a81549eea0b594e7e0",
      generic_export_host: "generic",
      codex_export_host: "codex",
      claude_export_host: "claude-code",
      receipt_roles: ["planner", "implementer", "verifier"]
    }
  },
  {
    name: "billing-or-migration-sensitive",
    input: {
      task_or_intent: "Assess billing or migration-sensitive change",
      task_class: "billing_sensitive",
      host_context: "billing flow or schema migration path",
      policy_layers: [
        {
          layer: "host_hard_constraints",
          hard_bounds: {
            permissions: { allow: ["repo_read"], deny: ["production_write", "production_secrets", "deployment"] },
            context_budget: { maximum_resource_count: 5, maximum_tool_schema_count: 3 },
            verification_gates: ["rollback_plan_present", "approval_required_for_migration"],
            escalation: ["manual_approval_required"]
          }
        }
      ],
      review_notes: ["advisory only"],
      host_export_target: "generic" as const
    },
    expected: {
      profile_id: "a15a0b937a1871ef",
      profile_digest: "7df25a833eb2f3fc3f7fe1b467e6f7cd7d3ef99deda089783592b951079203ef",
      lock_digest: "7df25a833eb2f3fc3f7fe1b467e6f7cd7d3ef99deda089783592b951079203ef",
      generic_export_host: "generic",
      codex_export_host: "codex",
      claude_export_host: "claude-code",
      receipt_roles: ["planner", "implementer", "verifier"]
    }
  }
] as const;

describe("execution-profile golden fixtures", () => {
  function clonePolicyLayers(layers: typeof cases[number]["input"]["policy_layers"]): import("../src/types.js").PolicyLayer[] {
    return layers.map((layer) => {
      const typedLayer = layer as {
        layer: import("../src/types.js").PolicyLayer["layer"];
        summary?: string;
        preferences?: {
          preferred_resources?: readonly string[];
          capability_requirements?: readonly string[];
        };
        unknowns?: readonly string[];
      };
      return {
      layer: typedLayer.layer,
      summary: typedLayer.summary,
      preferences: typedLayer.preferences
        ? {
            preferred_resources: [...(typedLayer.preferences.preferred_resources ?? [])],
            capability_requirements: [...(typedLayer.preferences.capability_requirements ?? [])]
          }
        : undefined,
      unknowns: typedLayer.unknowns ? [...typedLayer.unknowns] : undefined
      };
    });
  }

  for (const testCase of cases) {
    it(`pins public-safe artifacts for ${testCase.name}`, () => {
      const profile = buildExecutionProfile({
        ...testCase.input,
        policy_layers: clonePolicyLayers(testCase.input.policy_layers)
        ,
        review_notes: [...testCase.input.review_notes]
      });
      const lock = buildExecutionProfileLock(profile);
      const genericExport = buildGenericHostExportArtifact(profile);
      const codexExport = buildCodexHostExportArtifact(profile);
      const claudeExport = buildClaudeCodeHostExportArtifact(profile);

      expect(profile.profile_id).toBe(testCase.expected.profile_id);
      expect(profile.profile_digest).toBe(testCase.expected.profile_digest);
      expect(lock.profile_digest).toBe(testCase.expected.lock_digest);
      expect(lock).toMatchObject({
        profile_id: testCase.expected.profile_id,
        runtime_advisory_only: true,
        schema_version: "0.1.0"
      });
      expect(genericExport.host).toBe(testCase.expected.generic_export_host);
      expect(codexExport.host).toBe(testCase.expected.codex_export_host);
      expect(claudeExport.host).toBe(testCase.expected.claude_export_host);
      expect(
        renderOutcomeReceiptMarkdown({
          schema_version: "0.1.0",
          receipt_id: `receipt-${testCase.name}`,
          profile_id: profile.profile_id,
          profile_digest: profile.profile_digest,
          resolved_roles: [...testCase.expected.receipt_roles],
          verification_results: [{ gate: "tests_pass", passed: true }],
          warnings: [],
          unknowns: [],
          local_only: true
        })
      ).toContain("Outcome Receipt");
    });
  }
});

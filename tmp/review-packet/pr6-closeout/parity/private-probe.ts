import { EXECUTION_PROFILE_SCENARIOS } from "file:///C:/Users/sudhir.manchanda/OneDrive%20-%20Accenture/Desktop/Tinkering/graphiki-human-ui-fresh/src/lib/assetmason/execution-profile/fixtures/scenarios.ts";
import { buildExecutionProfile } from "file:///C:/Users/sudhir.manchanda/OneDrive%20-%20Accenture/Desktop/Tinkering/graphiki-human-ui-fresh/src/lib/assetmason/execution-profile/build.ts";
import { buildGenericHostExportArtifact } from "file:///C:/Users/sudhir.manchanda/OneDrive%20-%20Accenture/Desktop/Tinkering/graphiki-human-ui-fresh/src/lib/assetmason/execution-profile/hosts/generic.ts";
import { buildCodexHostExportArtifact } from "file:///C:/Users/sudhir.manchanda/OneDrive%20-%20Accenture/Desktop/Tinkering/graphiki-human-ui-fresh/src/lib/assetmason/execution-profile/hosts/codex.ts";
import { buildClaudeCodeHostExportArtifact } from "file:///C:/Users/sudhir.manchanda/OneDrive%20-%20Accenture/Desktop/Tinkering/graphiki-human-ui-fresh/src/lib/assetmason/execution-profile/hosts/claude-code.ts";
import { buildExecutionProfileLock } from "file:///C:/Users/sudhir.manchanda/OneDrive%20-%20Accenture/Desktop/Tinkering/graphiki-human-ui-fresh/src/lib/assetmason/execution-profile/lock.ts";
import { diffExecutionProfile } from "file:///C:/Users/sudhir.manchanda/OneDrive%20-%20Accenture/Desktop/Tinkering/graphiki-human-ui-fresh/src/lib/assetmason/execution-profile/diff.ts";
import { diffExecutionProfileLock } from "file:///C:/Users/sudhir.manchanda/OneDrive%20-%20Accenture/Desktop/Tinkering/graphiki-human-ui-fresh/src/lib/assetmason/execution-profile/lock.ts";
import { validateExecutionProfile, validateExecutionProfileLock, validateExecutionProfileDiff, validateHostExport } from "file:///C:/Users/sudhir.manchanda/OneDrive%20-%20Accenture/Desktop/Tinkering/graphiki-human-ui-fresh/src/lib/assetmason/execution-profile/validate.ts";

const scenarios = EXECUTION_PROFILE_SCENARIOS.map((scenario) => {
  const profile = buildExecutionProfile(scenario);
  const lock = buildExecutionProfileLock(profile);
  const genericExport = buildGenericHostExportArtifact(profile);
  const codexExport = buildCodexHostExportArtifact(profile);
  const claudeExport = buildClaudeCodeHostExportArtifact(profile);
  return {
    id: scenario.id,
    profile,
    lock,
    genericExport,
    codexExport,
    claudeExport,
    profileDiff: diffExecutionProfile(profile, { ...profile, review_notes: [...profile.review_notes, "changed"] }),
    lockDiff: diffExecutionProfileLock(lock, buildExecutionProfileLock({ ...profile, review_notes: [...profile.review_notes, "changed"] })),
    validations: {
      profile: validateExecutionProfile(profile),
      lock: validateExecutionProfileLock(lock),
      profileDiff: validateExecutionProfileDiff(diffExecutionProfile(profile, profile)),
      hostExport: validateHostExport(genericExport),
    }
  };
});
console.log(JSON.stringify({ source_sha: "85ad469a1f9f755e6155d34198afd733192d959e", scenarios }, null, 2));
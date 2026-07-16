PR #9 merged at 8f1773c19089205d8a50bb73a1132d7643376cf2. npm view confirms agent-resource-plan@0.1.0-preview.1 is present with preview dist-tag. The other two preview versions are still absent.
Workflow run 29393161229 published agent-resource-plan successfully, then failed on an immediate exact-version npm view readback. Recovery PR #10 now carries a bounded retry fix.
The preview.1 set is no longer synchronizable because agent-resource-plan@0.1.0-preview.1 is already immutable on the registry. PR #11 bumps all three packages to preview.2 and updates the publish workflow accordingly.

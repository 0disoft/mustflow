# Agent throughput audit

Scope: execution approval inference, verification profiles, installed workflow guidance, and a
pattern scan of all 297 canonical English skill procedures on 2026-09-05.

The scan found 261 skills using an unqualified verification-menu introduction and 205 listing
`test_release`. These counts identify ambiguous instructions, not 261 independent runtime bugs.
The shared workflow now defines all skill command lists as scoped choices and reuses successful
evidence. Four procedures with additional concrete obligations were corrected in both installed
and template copies.

| Bottleneck | Correction |
| --- | --- |
| Configured Git staging inferred commit approval | Only actual commits infer `git_commit`; explicit intent approval declarations still apply |
| Package metadata automatically expanded the edit profile | Metadata alone follows the selected profile; packaging, release and sensitive reasons retain their gates |
| Verification lists appeared cumulative | Select checks for changed behavior; do not repeat successful checks for reporting or another skill |
| Workflow contradicted AGENTS refresh guidance | Reuse loaded instructions and refresh changed or missing context |
| Completed local work triggered remote CI discovery | Local commits require local evidence; remote claims require remote evidence |
| Optional helper discovery became mandatory at completion | Discover helpers only for a named evidence gap |
| Any file overwrite could imply the highest risk tier | Require a reachable sensitive invariant or destructive overwrite |
| Existing user authorization was treated as missing | Pass already granted authorization through the action-specific CLI option |
| Catalog generation could not be followed by baseline acceptance | Permit the exact generated skill catalog path in the existing acceptance helper |

Security, privacy, payment, destructive operations, publication, and command eligibility continue
to use their declared contracts. This audit changes unnecessary expansion and repeated work;
it does not certify every specialized skill's domain-specific advice.

Verification is limited to the compiled CLI, approval/profile regressions, skill/template
consistency, documentation checks, and the repository's strict workflow check.

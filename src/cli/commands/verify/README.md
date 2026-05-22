# verify command modules

This directory holds narrow input-boundary helpers for `src/cli/commands/verify.ts`.

- `args.ts` parses and normalizes `mf verify` flags.
- `input.ts` loads change classification and changed-plan inputs.
- `evidence-input.ts` loads reproduction and external evidence inputs.
- `state-paths.ts` owns verify run directory, manifest, latest-summary, and per-intent receipt paths.

Keep execution, verdict assembly, receipt content writing, and output rendering outside these modules.

# verify command modules

This directory holds narrow input-boundary helpers for `src/cli/commands/verify.ts`.

- `args.ts` parses and normalizes `mf verify` flags.
- `input.ts` loads change classification and changed-plan inputs.
- `evidence-input.ts` loads reproduction and external evidence inputs.

Keep execution, verdict assembly, receipt writing, and output rendering outside these modules.

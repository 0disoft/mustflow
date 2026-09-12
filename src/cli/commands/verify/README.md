# verify command modules

This directory holds focused helpers for `src/cli/commands/verify.ts`.

- `args.ts` parses and normalizes `mf verify` flags.
- `input.ts` loads change classification and changed-plan inputs.
- `evidence-input.ts` loads reproduction and external evidence inputs.
- `state-paths.ts` owns verify run directory, manifest, latest-summary, and per-intent receipt paths.
- `result-types.ts` owns the internal receipt/result/summary shapes shared with the coordinator.
- `result-analysis.ts` owns result counts, failure classification and failure-fingerprint inputs;
  it does not execute commands or persist receipts.

Keep execution, verdict assembly, receipt content writing, and output rendering outside these modules.

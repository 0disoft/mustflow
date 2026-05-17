# validation

This directory contains the validation implementation behind the stable
`src/cli/lib/validation.ts` facade.

- `index.ts` keeps the public validation API and coordinates domain validators.
- `constants.ts` owns allowed values, paths, patterns, and static rule sets.
- `types.ts` owns shared report and issue shapes.
- `primitives.ts` owns low-level TOML, path, and issue helpers.
- `command-intents.ts` owns command-intent availability predicates shared by validation domains.
- `test-selection.ts` owns `.mustflow/config/test-selection.toml` validation.

Future validator moves should keep behavior-preserving domain boundaries: mustflow config,
preferences, versioning, skills, skill resources, context documents, and strict policies.

# validation

This directory contains the validation implementation behind the stable
`src/cli/lib/validation.ts` facade.

- `index.ts` keeps the public validation API and coordinates domain validators.
- `config.ts` validates mustflow, preferences, technology, and version-source configuration shapes.
- `skill-routes.ts` validates routing indexes, metadata, fixtures, and template skill profiles.
- `constants.ts` owns allowed values, paths, patterns, and static rule sets.
- `types.ts` owns shared report and issue shapes.
- `primitives.ts` owns low-level TOML, path, and issue helpers.
- `command-intents.ts` owns command-intent availability predicates shared by validation domains.
- `test-selection.ts` owns `.mustflow/config/test-selection.toml` validation.

Future validator moves should keep behavior-preserving domain boundaries: skills,
skill resources, context documents, storage limits, and strict policies.

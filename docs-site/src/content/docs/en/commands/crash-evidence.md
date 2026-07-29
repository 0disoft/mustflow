---
title: mf crash-evidence
description: Validate, normalize, and deterministically replay bounded native-crash evidence.
---

`mf crash-evidence` keeps three different claims separate: validating an evidence record,
normalizing an offline artifact, and replaying a modeled operation schedule.

## Validate

```sh
npx mf crash-evidence validate crash/evidence.json --json
```

The path must be a regular file inside the mustflow root and is limited to 4 MiB. Exit `0` means
the record is structurally and semantically valid; inspect `readiness`, because both `ready` and
valid `incomplete` records exit successfully. Rejected or unreadable input exits `1`.

## Collect

```sh
npx mf crash-evidence collect crash/crash.dmp --adapter windows-minidump --binary bin/app.exe --output crash/evidence.json --json
```

Adapters are `windows-minidump`, `linux-core`, and `sanitizer`. Collection is offline: it does not
run a debugger, load symbols, or infer missing registers and frames. `--binary` records the exact
candidate file SHA-256 as `candidate_only`; it does not prove that the file matches a captured
module. Output stays inside the mustflow root, does not overwrite by default, and requires
`--overwrite` to replace an existing regular file.

`captured_at` is the evidence collection time, not a claimed crash-occurrence time. Absolute module
paths found in minidumps are removed from the portable record.

## Race

```sh
npx mf crash-evidence race crash/race-scenario.json --json
```

The scenario declares actors, operations, their exact schedule, optional failure ordinal, and
address-reuse policy. The report records a deterministic trace and stable findings such as
use-after-free, stale generation, free while acquired, and incomplete schedules. It proves only
the modeled operation sequence, not native memory ordering or production timing.

## JSON Contracts

- Validation: `native-crash-evidence-validation-report.schema.json`
- Collection: `native-crash-evidence-collection-report.schema.json`
- Race input: `deterministic-race-scenario.schema.json`
- Race output: `deterministic-race-report.schema.json`

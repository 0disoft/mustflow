# Maintainer change plans

Use the permanent `release_plan_show`, `release_plan_stage`, and
`release_plan_commit` intents for ordinary commits as well as release preparation.
The historical name does not require a version bump or perform a release.
Do not add task-specific Git commands with fixed commit messages or stale path lists.

Save a task-specific JSON file under `.mustflow/state/release-plans/`:

```json
{
  "schema_version": "1",
  "base_head": "<current 40-character HEAD>",
  "paths": ["src/exact-file.ts", "tests/cli/exact-test.test.js"],
  "message": "🐛 fix(scope): describe the behavior\n\nExplain the change and relevant validation."
}
```

Review with `release_plan_show`, then stage and commit the same plan using its
typed `plan` input. Stage requires the current HEAD; commit also requires an exact
match between the planned and staged path sets. Do not include another task's files.
Plans are local state, and committed source remains the audit record.

The September 2026 cleanup retired 50 fixed Git stage/commit intents from the root
contract. Their definitions remain in Git history. Recreate a current plan instead
of restoring an old command. Release publishing and push intents are separate.

For reviewed workflow baseline changes, use `manifest_baseline_plan` with typed
`plan` and `target` inputs, inspect the saved path and hashes, then use
`manifest_baseline_apply`. Each configured plan targets one workflow file.
The built-in `baseline` command also accepts an explicit list of workflow paths.
When manifest drift prevents `mf run`, the exact configured built-in argv can be
invoked directly; it updates no source file and executes no repository command.
It does not require `--allow-untrusted-root`. Validate the edited command contract
before accepting its baseline. See the [run reference](../docs-site/src/content/docs/en/commands/run.md).

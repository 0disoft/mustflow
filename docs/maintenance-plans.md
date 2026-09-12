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

## Built-in skill authoring

Use `skill_author_plan` and `skill_author_apply` to create or update one canonical
English built-in skill. This maintainer helper prepares the installed source,
English template copy, both route tables and index rows, template creates and
profile membership, translation revisions, and representative route fixtures.
It does not copy third-party instructions or determine whether the procedure is useful.

Save a request under `.mustflow/state/skill-authoring/<task>.request.json` with:

| Field | Required content |
| --- | --- |
| `schema_version` | `"1"` |
| `name` | One lowercase hyphenated skill name |
| `skill` | Complete reviewed SKILL.md text, including native frontmatter and all standard sections |
| `route_toml` | Only this skill's route table and optional nested context/dependency tables |
| `index_row` | One seven-column Markdown row: trigger, skill path, input, edit scope, risk, verification, output |
| `profiles` | Exact desired profile membership; omitted profiles lose this skill, other skills stay intact |
| `fixtures` | Nonempty route cases with unique IDs prefixed by the skill name and a required main/adjunct/candidate placement |

New skills start at revision 1; updates increment the current revision by one.
Existing source/template skill drift must be resolved before planning. An index
row change increments both index revisions; skill translation text is preserved
and a previously current translation is marked for review.

1. Run `skill_author_plan` with typed `request` and `plan` inputs.
2. Inspect the plan's exact paths, `before_hash`, and full `after` text.
3. Run `skill_author_apply` with that same plan. The helper regenerates the plan
   and checks source hashes before writing, so stale or edited target lists fail.
4. Run `skill_route_catalog_write`, then the related skill/install tests and
   `skill_route_eval`. Catalog generation and verification remain separate,
   declared commands; applying source edits alone is not a completed skill change.
5. Review and apply exact manifest baseline plans for the changed managed files,
   regenerate navigation when required, and finish with `mustflow_check`.

Each file is published atomically. On an ordinary write error, the helper restores
earlier writes only when they still match its own output. Concurrent edits are
preserved and any unrestored paths are reported. A killed process or machine
failure can still leave a partial multi-file update; inspect the saved plan and
working diff before preparing a fresh plan. This is not a filesystem transaction.
Renames, deletions, supporting reference assets, and localized skill authoring
remain explicit reviewed maintenance operations.

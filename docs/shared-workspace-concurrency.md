# Concurrent tasks in a shared workspace

For a root such as `zerodi-wd1` with independent repositories under `projects/`, select
each delegated command with `mf run <intent> --repo projects/<repository>`. Named locks are
namespaced per delegated repository. Matching paths and shared resources still serialize.

Root receipt publication uses short mutexes. Read this run's returned receipt path; another
task may replace `latest.json` immediately. Dead receipt-mutex owners are recovered without
waiting through the normal 35-second contention budget. Live owners retain exclusive access.

Manifest edits must use entry-scoped compare-and-swap plans for explicitly reviewed paths.
Independent entry updates merge. A changed target file or target entry rejects the plan.
Never accept all dirty root files to unblock a child task: they can belong to unfinished work
in another task. Keep request, plan and commit-message files unique to each task.

Manifest publication uses the same atomic writer as other state files, including bounded
Windows sharing-violation retries. It never deletes the existing manifest to make a rename work.

A whole-root check intentionally reads shared root state and may conflict with a manifest writer.
Use child checks, or the scoped parent check when one delegated contract changed. Wait for a
live conflicting check; do not remove its lock. Root contract drift may still require explicit
review before a root-level maintenance command can run.

These changes cover the tested lock and manifest paths, not arbitrary direct writes by other
tools. Git staging remains shared within one checkout: use exact path plans and check the
staged set, or separate worktrees when tasks edit the same repository.

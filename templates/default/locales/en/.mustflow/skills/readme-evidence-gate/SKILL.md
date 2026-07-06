---
mustflow_doc: skill.readme-evidence-gate
locale: en
canonical: true
revision: 4
lifecycle: mustflow-owned
authority: procedure
name: readme-evidence-gate
description: Apply this skill when README content is generated, reviewed, or audited for unsupported claims, README-as-investment-deck overclaim, unshipped roadmap-as-current wording, fake or internal-demo usage examples, subjective maintenance-debt wording such as TODO later, temporary, for now, probably, internal team reasons, ask Slack or a person, sample may differ, or see code, and drift-prone executable README contracts such as install, setup, run, dev server, test, build, Docker, environment, API, CLI output, package-manager guidance, support matrices, badges, roadmap, architecture, file-tree explanations, license, trademark, copyright, credit, attribution, or security-exposure surfaces such as real-looking fake keys, internal URLs, production paths, API keys in query strings, screenshots, and pasteable production commands.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.readme-evidence-gate
  command_intents:
    - docs_validate_fast
    - test_related
    - test_release
    - mustflow_check
---

# README Evidence Gate

<!-- mustflow-section: purpose -->
## Purpose

Prevent README prose from becoming a contract for features, setup paths, APIs, safety claims, or future work that the repository does not actually support.

<!-- mustflow-section: use-when -->
## Use When

- README text is generated from code, issue notes, AI output, review feedback, or a rough project summary.
- A README draft lists features, quick-start steps, install or run commands, environment variables, public APIs, supported platforms, architecture, license, roadmap, security, performance, or scalability claims.
- A README review needs to find hallucinated claims, fake commands, invented environment variables, unsupported examples, or marketing words that outrun the code.
- A README uses production-ready, enterprise-grade, one-line integration, platform, system, engine, support, badge, or roadmap language that may describe aspiration instead of shipped behavior.
- README examples may call desired APIs instead of current public APIs, hide internal demo prerequisites, or omit normal failure paths such as auth failure, timeout, empty data, permission denied, rate limit, pagination, or idempotency.
- README, `.env.example`, examples, screenshots, or contribution templates may expose real-looking fake keys, API keys in URL query strings, internal domains, private IPs, admin URLs, production paths, bucket names, customer identifiers, or pasteable production commands.
- A README contains TODO, later, temporary, for now, probably, usually, team-reason, legacy, not organized yet, ask Slack or person, production differs, sample may differ, or see code wording that describes a person's work state instead of the current user contract.
- README code blocks, command examples, CLI output snippets, import examples, environment examples, install instructions, test commands, build output paths, server startup instructions, or runtime support statements need to be checked as pasteable contracts.
- README license, trademark, copyright, attribution, credit, third-party asset, AI-generated content, or open-source status claims need to be checked against repository-owned rights and notice evidence.
- `readme-authoring` is active and the README contains more than a small link-only or typo-only change.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only fixes spelling, broken anchors, or formatting and does not add or preserve factual claims.
- The task edits a non-README documentation page whose owning skill has a stricter claim-evidence procedure.
- The user explicitly asks for speculative marketing copy, a pitch, or roadmap ideation outside repository truth.
- The repository evidence is unavailable and the task can be completed by reporting the missing evidence without editing the README.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The README draft or existing README sections under review.
- Repository evidence for each factual claim: manifests, command contracts, package manager metadata, lockfiles, package scripts, `bin`, `exports`, `main`, `module`, `types`, source entry points, public exports, examples, tests, schemas, config files, `.env.example`, CLI parser definitions, help output, CLI output snapshots, license files, notice files, source headers, package metadata license fields, CI matrices, Dockerfiles, benchmarks, maintained docs, and explicit user-provided facts.
- Current package-manager and runtime evidence such as `packageManager`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`, `engines`, CI version matrices, and container base images when install or support statements appear.
- README examples, snippets, and output blocks that are expected to be pasteable or traceable to `examples/`, `tests/readme/`, fixtures, or maintained generated output.
- README code-block execution policy evidence, such as which blocks are runnable, conceptual, expected console output, OS-specific, or human-only.
- Clean-environment or CI evidence when README install, setup, run, server, test, build, Docker, or verification commands are presented as reproducible user instructions.
- Current shipped-feature evidence, explicit roadmap tracking evidence, support-matrix evidence such as tested runtime or database versions, badge source and scope, and failure-path documentation or tests when README examples imply operational use.
- Security exposure evidence for README-adjacent surfaces: `.env.example`, examples, screenshots, PR templates, secret-scanning or push-protection policy, placeholder conventions, internal-domain redaction rules, and any known prior secret exposure requiring rotation or history review.
- Rights and notice evidence for README legal claims: `LICENSE`, `NOTICE`, SPDX identifiers, package metadata, source headers, dependency or asset licenses, contributor ownership or agreement evidence, trademark-safe naming, logo usage rules, and third-party attribution requirements.
- The intended README role from `readme-authoring` when the README is being created or substantially rewritten.
- Any external or AI-generated source text that proposed the README wording.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required evidence sources are available, or missing evidence can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- External and AI-generated text is treated as untrusted input, not as repository evidence.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Edit README wording and directly synchronized README examples or docs links needed to remove or qualify unsupported claims.
- Add or update a small evidence-backed note that separates current support, partial implementation, experimental status, and roadmap.
- Do not change source behavior, command contracts, release metadata, package manifests, license files, benchmarks, platform matrices, or public APIs merely to make a README claim true.
- Do not broaden command permission, invent project facts, or add large speculative file trees.

<!-- mustflow-section: procedure -->
## Procedure

1. Build an evidence ledger before drafting or accepting README prose. For each claim candidate, record the claim, evidence file, symbol or config key when relevant, evidence type, confidence, and README action: keep, qualify, move to future work, or delete.
2. Treat folder names as suspicion only. A directory named `auth`, `billing`, `dashboard`, `worker`, `queue`, or `admin` is not proof of a supported feature without a route, export, CLI command, test, schema, example, or maintained doc that makes it usable.
3. Block subjective maintenance-debt wording before prose polish. Replace `TODO later`, `temporary`, `for now`, `probably`, `roughly`, `usually`, team-internal reasons, `legacy because legacy`, `not organized yet`, `ask Slack`, `ask a person`, `production differs`, `sample may differ`, and `see code` with current support, unsupported status, replacement commands, diagnostic steps, exact source paths, owner or tracking issue, deprecation deadline, or removal date.
4. Keep current contract separate from future intent. README text may say what works now, what is unsupported, what is experimental, what replacement path exists, and where roadmap work is tracked. Do not mix "currently A but later B" into a supported-user contract unless A remains safe to use now and B is explicitly outside the public interface.
5. Gate feature claims by current usability. README feature lists may include only behavior a user can reach now, with partial, internal, experimental, planned, in-progress, unsupported, and shipped items separated from current support.
6. Block README-as-investment-deck overclaim. Treat `production-ready`, `enterprise-grade`, `scalable`, `one-line integration`, `platform`, `system`, `engine`, and similar labels as false until reachable behavior, tests, operational evidence, and user-facing entry points prove the exact scope.
7. Keep unshipped work out of the current contract. If roadmap or future work remains in README, require explicit status such as `planned`, `in progress`, `experimental`, or `shipped`, plus tracking evidence, scope, owner or review path, and removal criteria. Otherwise move it out of the README.
8. Gate API and usage examples against the real public surface. Examples must call current public APIs, CLI entry points, or maintained examples, not hoped-for methods or copied competitor README concepts such as plugin, adapter, middleware, or provider support that this repository does not expose.
9. Surface hidden internal demo prerequisites. If an example depends on account rights, region, model access, proxy settings, sample databases, migrations, workers, Redis, Postgres, queues, admin tokens, or internal fixtures, state the prerequisite or remove the example from the general quick start.
10. Define support as tested support. Replace broad support claims with tested ranges such as `tested with PostgreSQL 15 and 16` when evidence exists; do not treat "worked once locally" as supported platform, database, provider, browser, OS, or runtime coverage.
11. Treat badges and numbers as scoped signals, not stability proof. Build badges, coverage, download counts, stars, benchmarks, and adoption numbers need a source, scope, and date when used; they cannot substitute for feature, readiness, security, or support evidence.
12. Require failure-path evidence for operational examples. When README examples imply normal production use, point to or include behavior for auth failure, timeout, empty data, permission denied, rate limit, pagination, and idempotency when those conditions are relevant to the documented API or workflow.
13. Keep experimental features visually and procedurally separate. Do not promote experimental features in the primary install flow, first quick start, main screenshot, or top feature list unless the README makes the experimental boundary impossible to miss.
14. Gate package-manager and install guidance by declared sources. Match install commands to lockfiles and package metadata such as `packageManager`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, and `bun.lock`; do not default to npm, yarn, pnpm, Bun, Docker, or global CLI installation because it is common in the ecosystem.
15. Prefer reproducible install wording when the repository evidence supports it. For example, lockfile-backed Node README instructions should favor `npm ci` over a mutating `npm install` path when npm lockfile evidence exists, and Python dependency instructions should include `python -m pip check` after requirements installation when that is part of the maintained setup contract.
16. Gate commands by declared or maintained sources. Installation, quick-start, development, test, build, Docker, deployment, and verification commands must come from package scripts, command contracts, Makefiles, Docker or Compose files, language manifests, maintained docs, or explicit user instructions. Distinguish development server commands from production build and start commands.
17. Statically map README commands to real entry points before prose polish. A package script reference such as `npm run dev` must exist in package metadata, a language-framework command such as `python manage.py runserver` must have the named entry file, a Compose service must exist in Compose config, and a container example must identify a real image or build path instead of nonsense placeholders such as `docker run .`.
18. Separate install, setup, run, server-readiness, test, and build claims. Do not let one successful command imply the rest of the README workflow works. When the README presents server startup as runnable, require a readiness signal such as a health endpoint, expected port, expected page response, or documented manual boundary.
19. Label README code blocks by execution status when the repository uses or adopts such a convention. Keep runnable shell blocks such as `bash verify` separate from expected console output, conceptual snippets, `bash no-run`, destructive or human-only commands, and OS-specific examples so automated extraction cannot run placeholder text.
20. Check OS and shell boundaries for pasteable instructions. A README that claims Windows, macOS, Linux, Bash, cmd, or PowerShell support must not mix incompatible environment-variable syntax, path syntax, line continuations, or prompt markers without labeling the target shell.
21. Gate CLI names and options by executable surfaces. README CLI names must match `bin` or documented entry points, and options, aliases, defaults, required flags, help text, output examples, stdout/stderr shape, and exit semantics must match CLI parser code, `--help`, fixtures, snapshots, or maintained output tests.
22. Gate environment variables by code or config. Document only variables found in source lookups, config schemas, runtime manifests, `.env.example`, or maintained configuration docs. If README and `.env.example` disagree, fix the README only when the code evidence supports it, otherwise report the conflict.
23. Gate API examples by public surface. Library examples must start from public exports, documented CLI entry points, generated API references, or tested examples. Match import paths against `exports`, `main`, `module`, `types`, source entry points, and declaration output. Do not document internal helpers, guessed import paths, guessed argument order, or sync/async behavior without source evidence.
24. Treat README code blocks as pasteable contracts. Prefer examples under `examples/`, `tests/readme/`, fixtures, generated output snapshots, or CI-exercised README examples when feasible; otherwise qualify conceptual snippets so they cannot be mistaken for runnable setup, API, CLI, or deployment instructions.
25. Gate README security exposure as if the README is public distribution, even for private repositories. README, `.env.example`, examples, screenshots, and package artifacts can leak through package publication, Docker images, wikis, customer handoffs, and LLM/code scans.
26. Use placeholder-shaped secrets only. Do not include real credentials or real-looking fake keys such as `sk_live_...`, `AKIA...`, or `ghp_...`; use placeholders such as `replace-with-your-api-key` and avoid real domains, project IDs, regions, account names, bucket names, tenant IDs, or customer names.
27. Keep secrets out of URLs and pasteable production commands. Ban API keys in URL query strings; prefer `Authorization` header examples. Do not include pasteable production commands such as production `kubectl`, destructive pod, real backup bucket, production migration, or production deploy commands in README.
28. Redact internal and production topology. Replace internal URLs, private IPs, admin URLs, staging or production domains, production filesystem paths, deployment user paths, private-key paths, cluster names, database names, and bucket names with `example.com`, `example.test`, or `localhost` placeholders.
29. Check screenshots and images as README content. Do not accept screenshots that show tokens, auth headers, account IDs, internal URLs, private IPs, dashboards, logs, incident IDs, customer names, tenant IDs, or production identifiers.
30. Treat historical secret exposure as an incident, not a prose fix. If README, docs, examples, or screenshots ever contained a real secret, report the need for revocation, rotation, history scanning, and log review; deleting the current line is not sufficient.
31. Gate test, build, and runtime support claims against real surfaces. Test commands must match the configured runner and script options; build output paths must match the configured build result; supported versions must match `engines`, CI matrices, runtime APIs, and Dockerfiles rather than hope or convention.
32. Gate README legal claims as repository contracts, not slogans. Do not say `open source`, `MIT`, `Apache`, `GPL`, `commercial use allowed`, `no attribution required`, `official`, `certified`, `partner`, or similar rights/status language unless `LICENSE`, `NOTICE`, SPDX identifiers, package metadata, source headers, third-party notices, asset attributions, contributor rights, and trademark-safe wording agree.
33. Use exact SPDX identifiers when a README names a software license. Keep `Apache-2.0`, `MIT`, `GPL-3.0-only`, `GPL-3.0-or-later`, and similar identifiers aligned across README, license files, package metadata, source headers, and notice surfaces.
34. Preserve license conditions instead of collapsing them into permission slogans. If the README says commercial use is allowed, also preserve required notice, attribution, source-availability, copyleft, patent, NOTICE, or network-use obligations when they apply.
35. Keep code, docs, assets, and trademarks separate. Creative Commons may fit docs, art, or media but is usually not the right software-code license; open-source code rights do not grant trademark or logo rights; and third-party asset credits should identify title, author, source, license, and modification status when the license requires it.
36. Treat AI-generated provenance claims as weak evidence. A README cannot waive attribution, copyright, license, asset, snippet, or trademark obligations merely by saying content was AI-generated.
37. Gate security, privacy, production-readiness, encryption, authorization, role-based access, secret handling, performance, scalability, benchmark, lightweight, platform-support, compatibility, and license claims with explicit evidence. Prefer deletion or narrow wording when evidence is missing.
38. Gate architecture explanations by executable structure. Do not describe queues, workers, microservices, databases, caches, frontends, backends, deployment topology, or failure domains unless those surfaces exist in current code, config, infra files, tests, or maintained architecture docs.
39. Keep file-tree explanations short and entry-point oriented. Include only paths a README reader needs to start, configure, verify, or contribute; do not describe broad folders from their names.
40. Run a reverse audit after the draft: scan every README sentence for unsupported nouns, verbs, adjectives, numbers, commands, env vars, imports, platforms, code blocks, output snippets, screenshots, rights claims, internal-state wording, and future-tense promises. Remove or qualify anything missing ledger evidence.
41. Treat high-risk adjectives as blocked until proven: `production-ready`, `secure`, `encrypted`, `scalable`, `enterprise-grade`, `robust`, `battle-tested`, `fully featured`, `seamless`, `10x`, `lightweight`, and similar marketing claims.
42. Activate narrower skills before accepting claims that belong to another contract surface:
   - command examples, help text, JSON output, or exit semantics: `command-intent-mapping-gate`, `cli-option-contract-review`, or `cli-output-contract-review`;
   - external tool versions, provider behavior, package-manager guidance, or current compatibility: `source-freshness-check` or `version-freshness-check`;
   - security, privacy, secrets, permission, retention, or disclosure claims: `security-privacy-review`;
   - license, provenance, copied content, or third-party asset claims: `provenance-license-gate`;
   - package contents, release readiness, install behavior, or template output: `release-publish-change` or `template-install-surface-sync`.
43. When README changes are reviewed through pull requests or release gates, prefer reproducibility evidence over prose approval. Installation logs, server readiness logs, test logs, build logs, or packaged README example artifacts should back the claim when configured checks exist; otherwise report the missing evidence instead of treating a sentence review as proof.

<!-- mustflow-section: postconditions -->
## Postconditions

- Each README factual claim is backed by repository evidence, explicitly qualified, or removed.
- Subjective TODO, temporary, internal-reason, ask-person, sample-may-differ, and see-code wording is removed or converted into current support, unsupported status, replacement path, diagnostic step, exact source path, owner or tracking evidence, deadline, or tracking issue.
- Current support, partial implementation, experimental work, and roadmap are not mixed.
- Unshipped roadmap items, internal demo prerequisites, fake desired APIs, overbroad support claims, unsupported badges, copied competitor concepts, and experimental promotion are separated, qualified, removed, or reported.
- Unsupported commands, environment variables, API examples, security, performance, platform, license, trademark, copyright, attribution, architecture, and file-tree claims are absent or reported.
- README security exposure is removed or reported: real-looking fake keys, URL-query secrets, internal URLs, private IPs, production paths, pasteable production commands, sensitive identifiers, unsafe screenshots, and missing secret rotation or history-scan follow-up after known exposure.
- README code blocks, command examples, CLI output snippets, import examples, environment examples, test commands, build output paths, server readiness claims, OS-specific shell examples, and runtime support statements are pasteable, tested, explicitly conceptual, or reported as unverified.
- README legal and credit claims agree with license, notice, SPDX, package metadata, source-header, dependency, asset, contributor, and trademark evidence, or are removed or reported.
- Any evidence gap, conflict, or deferred verification is named in the final report.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `docs_validate_fast`
- `mustflow_check`

Use `test_related` when README examples, command snippets, public API usage, or generated examples are changed and the configured related tests cover them.
Use `test_release` when package installation, package contents, release metadata, template install output, or README examples in packaged artifacts are affected.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a README claim lacks evidence, remove it or qualify it instead of searching for weaker hints.
- If evidence conflicts across code, tests, docs, and manifests, keep the README conservative and report the conflict.
- If the user asks to keep a claim that cannot be proven, mark it as unverified or future work only when that wording is honest.
- If verification fails, fix the first README-related broken link, stale command, unsupported example, or template drift before adding new prose.
- If this gate would require changing code to match README prose, stop and report that the README claim outruns the implementation.

<!-- mustflow-section: output-format -->
## Output Format

- README sections gated
- Evidence ledger summary
- Claims kept, qualified, moved, or removed
- Subjective maintenance-debt phrases removed or converted
- README overclaim, roadmap, support, badge, fake-example, internal-demo, experimental, and failure-path checks performed
- Pasteable README contract checks performed
- README security exposure checks performed
- README executable-command, clean-environment, code-block-label, OS-shell, server-readiness, and env-key consistency checks performed
- README license, SPDX, NOTICE, trademark, contributor-rights, third-party credit, and AI-provenance checks performed
- Unsupported commands, environment variables, APIs, security, performance, platform, license, roadmap, architecture, or file-tree claims found
- Related skills activated or deferred
- Command intents run
- Skipped command intents and reasons
- Remaining README evidence risk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

function readText(relativePath) {
	return readFileSync(path.join(projectRoot, ...relativePath.split('/')), 'utf8');
}

test('README and project context authoring routes stay separated', () => {
	const readmeSkill = readText('.mustflow/skills/readme-authoring/SKILL.md');
	const projectContextSkill = readText('.mustflow/skills/project-context-authoring/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');

	assert.match(readmeSkill, /root `README\.md`/u);
	assert.match(readmeSkill, /repository-supported evidence/u);
	assert.match(readmeSkill, /missing inputs can be reported without guessing/u);
	assert.match(readmeSkill, /marketing copy/u);
	assert.match(projectContextSkill, /The task only updates root `README\.md`/u);

	assert.match(skillIndex, /`README\.md` is created, restructured, or substantially rewritten/u);
	assert.match(skillIndex, /invented project claims/u);
	assert.match(skillIndex, /loss of human-authored intent/u);
	assert.match(skillIndex, /`\.mustflow\/context\/PROJECT\.md` needs cautious project context/u);
});

test('skill route selection convention treats authoring as a main route', () => {
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');

	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(skillIndex, /Choose one main route: a `primary` route/u);
	assert.match(skillIndex, /Treat `authoring` routes as selectable main routes, not adjunct routes/u);
	assert.match(skillIndex, /choose one main route \(`primary` or `authoring`\) and at most two adjunct/u);
	assert.match(
		routes,
		/\[routes\."security-privacy-review"\]\r?\ncategory = "security_privacy"\r?\nroute_type = "primary"/u,
	);
});

test('idea triage keeps brainstorming evidence-based and bounded', () => {
	const localSkill = readText('.mustflow/skills/idea-triage/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/idea-triage/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /outside AI suggestions/u);
	assert.match(localSkill, /apply_now/u);
	assert.match(localSkill, /defer/u);
	assert.match(localSkill, /reject/u);
	assert.match(localSkill, /research/u);
	assert.match(localSkill, /future work/u);
	assert.match(localSkill, /current-behavior claims for unimplemented ideas/u);
	assert.match(localSkill, /non-goals, and core promises/u);
	assert.match(localSkill, /do not classify it as `apply_now`/u);
	assert.match(localSkill, /module boundary, architecture, external service boundary, or command contract/u);
	assert.match(skillIndex, /\.mustflow\/skills\/idea-triage\/SKILL\.md/u);
	assert.match(skillIndex, /apply, defer, reject, or research decisions/u);
	assert.match(routes, /\[routes\."idea-triage"\]\r?\ncategory = "workflow_contracts"\r?\nroute_type = "primary"/u);
	assert.match(routes, /applies_to_reasons = \["unknown_change", "docs_change", "mustflow_docs_change", "workflow_change", "product_change"\]/u);
	assert.match(manifest, /"idea-triage"/u);
});

test('proactive risk surfacing permits bounded evidence-backed intervention', () => {
	const localSkill = readText('.mustflow/skills/proactive-risk-surfacing/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/proactive-risk-surfacing/SKILL.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /scope-adjacent risk/u);
	assert.match(localSkill, /fix_now/u);
	assert.match(localSkill, /report_only/u);
	assert.match(localSkill, /ask_first/u);
	assert.match(localSkill, /ignore/u);
	assert.match(localSkill, /same root cause/u);
	assert.match(localSkill, /high_severity_adjacent/u);
	assert.match(localSkill, /Do not perform broad unrelated refactors/u);
	assert.match(localSkill, /No current repository evidence supports the extra concern/u);
	assert.match(skillIndex, /\.mustflow\/skills\/proactive-risk-surfacing\/SKILL\.md/u);
	assert.match(skillIndex, /fix now, report only, ask first, or ignore/u);
	assert.match(routes, /\[routes\."proactive-risk-surfacing"\]\r?\ncategory = "workflow_contracts"\r?\nroute_type = "event"/u);
	assert.match(routes, /applies_to_reasons = \["unknown_change", "code_change", "behavior_change", "test_change", "docs_change", "mustflow_docs_change", "public_api_change", "security_change", "privacy_change", "data_change", "performance_change", "ui_change", "release_risk"\]/u);
	assert.match(manifest, /"\.mustflow\/skills\/proactive-risk-surfacing\/SKILL\.md"/u);
	assert.match(manifest, /"proactive-risk-surfacing"/u);
	assert.match(i18n, /\[documents\."skill\.proactive-risk-surfacing"\]/u);
});

test('heuristic candidate selection keeps broad scans cheap and bounded', () => {
	const localSkill = readText('.mustflow/skills/heuristic-candidate-selection/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/heuristic-candidate-selection/SKILL.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /cheap repository signals/u);
	assert.match(localSkill, /without reading every full file/u);
	assert.match(localSkill, /frontmatter, imports, exports, component wrappers/u);
	assert.match(localSkill, /Calibrate small-file findings by file role/u);
	assert.match(localSkill, /Limit candidates per folder or package/u);
	assert.match(localSkill, /small random or representative sample/u);
	assert.match(localSkill, /skipped_healthy/u);
	assert.match(localSkill, /needs_source/u);
	assert.match(localSkill, /Do not fill unknown source material/u);
	assert.match(localSkill, /Compare the post-change state/u);
	assert.match(skillIndex, /\.mustflow\/skills\/heuristic-candidate-selection\/SKILL\.md/u);
	assert.match(skillIndex, /cheap-signal candidate selection/u);
	assert.match(routes, /\[routes\."heuristic-candidate-selection"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"/u);
	assert.match(routes, /applies_to_reasons = \["unknown_change", "code_change", "docs_change", "test_change", "behavior_change", "performance_change", "ui_change", "data_change"\]/u);
	assert.match(manifest, /"\.mustflow\/skills\/heuristic-candidate-selection\/SKILL\.md"/u);
	assert.match(manifest, /"heuristic-candidate-selection"/u);
	assert.match(i18n, /\[documents\."skill\.heuristic-candidate-selection"\]/u);
});

test('AI-generated code hardening catches duplicate, coupling, error, and test debt', () => {
	const localSkill = readText('.mustflow/skills/ai-generated-code-hardening/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/ai-generated-code-hardening/SKILL.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /AI-generated/u);
	assert.match(localSkill, /duplicate helpers/u);
	assert.match(localSkill, /single source of truth/u);
	assert.match(localSkill, /hidden coupling/u);
	assert.match(localSkill, /circular dependencies/u);
	assert.match(localSkill, /barrel exports/u);
	assert.match(localSkill, /re-export drift/u);
	assert.match(localSkill, /swallowed errors/u);
	assert.match(localSkill, /empty `catch`/u);
	assert.match(localSkill, /god function/u);
	assert.match(localSkill, /god file/u);
	assert.match(localSkill, /fan-in and fan-out/u);
	assert.match(localSkill, /behavior and side effects/u);
	assert.match(localSkill, /strings, snapshots/u);
	assert.match(localSkill, /Mock only external boundaries/u);
	assert.match(localSkill, /edge cases/u);
	assert.match(localSkill, /does not authorize adding new dependencies, CI gates, or\s+command contracts/u);
	assert.match(skillIndex, /\.mustflow\/skills\/ai-generated-code-hardening\/SKILL\.md/u);
	assert.match(skillIndex, /AI-generated, vibe-coded, copied, or broad code changes/u);
	assert.match(skillIndex, /string-only tests, over-mocking, fallback sprawl/u);
	assert.match(routes, /\[routes\."ai-generated-code-hardening"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /applies_to_reasons = \["unknown_change", "code_change", "behavior_change", "test_change", "public_api_change", "performance_change"\]/u);
	assert.match(manifest, /"\.mustflow\/skills\/ai-generated-code-hardening\/SKILL\.md"/u);
	assert.match(manifest, /"ai-generated-code-hardening"/u);
	assert.match(i18n, /\[documents\."skills\.index"\][\s\S]*?revision = 109/u);
	assert.match(i18n, /\[documents\."skill\.ai-generated-code-hardening"\][\s\S]*?revision = 1/u);
});

test('github contribution quality gate keeps maintainer-facing GitHub posts evidence-based', () => {
	const localSkill = readText('.mustflow/skills/github-contribution-quality-gate/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/github-contribution-quality-gate/SKILL.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /repository templates/u);
	assert.match(localSkill, /duplicate search/u);
	assert.match(localSkill, /SUPPORT\.md/u);
	assert.match(localSkill, /SECURITY\.md/u);
	assert.match(localSkill, /AI assistance/u);
	assert.match(localSkill, /human contributor/u);
	assert.match(localSkill, /PRIVATE_SECURITY_REPORT/u);
	assert.match(localSkill, /ASK_IN_EXISTING_THREAD/u);
	assert.match(localSkill, /POST_AS_DRAFT/u);
	assert.match(localSkill, /DO_NOT_POST/u);
	assert.match(localSkill, /`same problem here`/u);
	assert.match(skillIndex, /\.mustflow\/skills\/github-contribution-quality-gate\/SKILL\.md/u);
	assert.match(skillIndex, /maintainer-facing comment content/u);
	assert.match(routes, /\[routes\."github-contribution-quality-gate"\]\r?\ncategory = "workflow_contracts"\r?\nroute_type = "primary"/u);
	assert.match(routes, /applies_to_reasons = \["unknown_change", "docs_change", "workflow_change", "public_api_change"\]/u);
	assert.match(manifest, /"\.mustflow\/skills\/github-contribution-quality-gate\/SKILL\.md"/u);
	assert.match(manifest, /"github-contribution-quality-gate"/u);
});

test('cpp code change keeps target identity and compatibility risk explicit', () => {
	const localSkill = readText('.mustflow/skills/cpp-code-change/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/cpp-code-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /owning build target/u);
	assert.match(localSkill, /compilation identity/u);
	assert.match(localSkill, /Local compile success alone does not prove/u);
	assert.match(localSkill, /source_api/u);
	assert.match(localSkill, /binary_abi/u);
	assert.match(localSkill, /static_link_contract/u);
	assert.match(localSkill, /generated_binding/u);
	assert.match(localSkill, /ffi_boundary/u);
	assert.match(localSkill, /undefined-behavior/u);
	assert.match(localSkill, /std::string_view/u);
	assert.match(localSkill, /std::span/u);
	assert.match(localSkill, /noexcept/u);
	assert.match(localSkill, /modern, shorter, or cleaner-looking/u);
	assert.match(localSkill, /Do not invent native build/u);
	assert.match(skillIndex, /\.mustflow\/skills\/cpp-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /C\+\+ source, headers, modules/u);
	assert.match(routes, /\[routes\."cpp-code-change"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"/u);
	assert.match(routes, /applies_to_reasons = \["code_change", "public_api_change", "test_change", "package_metadata_change"\]/u);
	assert.match(manifest, /"\.mustflow\/skills\/cpp-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"cpp-code-change"/u);
});

test('Node, Bun, and Docker code change skills keep runtime and toolchain ownership explicit', () => {
	const nodeSkill = readText('.mustflow/skills/node-code-change/SKILL.md');
	const templateNodeSkill = readText('templates/default/locales/en/.mustflow/skills/node-code-change/SKILL.md');
	const bunSkill = readText('.mustflow/skills/bun-code-change/SKILL.md');
	const templateBunSkill = readText('templates/default/locales/en/.mustflow/skills/bun-code-change/SKILL.md');
	const dockerSkill = readText('.mustflow/skills/docker-code-change/SKILL.md');
	const templateDockerSkill = readText('templates/default/locales/en/.mustflow/skills/docker-code-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(nodeSkill, templateNodeSkill);
	assert.equal(bunSkill, templateBunSkill);
	assert.equal(dockerSkill, templateDockerSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);

	assert.match(nodeSkill, /deployment runtime as the hard constraint/u);
	assert.match(nodeSkill, /CI runtime as the verified constraint/u);
	assert.match(nodeSkill, /package manager ownership/u);
	assert.match(nodeSkill, /Adding `exports` can block deep imports/u);
	assert.match(nodeSkill, /dual package hazards/u);
	assert.match(nodeSkill, /Node native TypeScript execution is limited type stripping/u);
	assert.match(nodeSkill, /does not typecheck, read `tsconfig`, resolve path aliases, emit declarations/u);
	assert.match(nodeSkill, /Do not migrate Jest, Vitest, Playwright, or another runner to `node:test`/u);
	assert.match(nodeSkill, /permission model as a trusted-code seatbelt/u);

	assert.match(bunSkill, /Classify every Bun signal by role/u);
	assert.match(bunSkill, /package manager signals/u);
	assert.match(bunSkill, /runtime signals/u);
	assert.match(bunSkill, /test runner signals/u);
	assert.match(bunSkill, /bundler or compiler signals/u);
	assert.match(bunSkill, /If `bun.lock` exists, treat Bun as the dependency owner/u);
	assert.match(bunSkill, /Treat `trustedDependencies` as install-time code execution policy/u);
	assert.match(bunSkill, /Do not claim Bun runs TypeScript as typecheck/u);
	assert.match(bunSkill, /Bun build output proves bundling for the selected target and format/u);
	assert.match(bunSkill, /A CLI with `#!\/usr\/bin\/env node` may execute under Node/u);

	assert.match(dockerSkill, /Prevent container image accidents/u);
	assert.match(dockerSkill, /This skill is not a Docker syntax guide/u);
	assert.match(dockerSkill, /runtime-source app/u);
	assert.match(dockerSkill, /compiled artifact app/u);
	assert.match(dockerSkill, /Use Debian slim as a conservative default/u);
	assert.match(dockerSkill, /Alpine\s+only after libc and native package behavior are verified/u);
	assert.match(dockerSkill, /distroless or `scratch` only/u);
	assert.match(dockerSkill, /Preserve build cache boundaries/u);
	assert.match(dockerSkill, /Check `.dockerignore` whenever build context changes/u);
	assert.match(dockerSkill, /Do not put tokens, passwords, SSH keys/u);
	assert.match(dockerSkill, /Treat `USER` as a runtime proof obligation/u);
	assert.match(dockerSkill, /Keep Compose scoped/u);
	assert.match(dockerSkill, /PR and fork events should not push images/u);
	assert.match(dockerSkill, /missing Docker-specific verification/u);

	assert.match(skillIndex, /\.mustflow\/skills\/node-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /\.mustflow\/skills\/bun-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /\.mustflow\/skills\/docker-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /remaining Node\.js risk/u);
	assert.match(skillIndex, /remaining Bun risk/u);
	assert.match(skillIndex, /remaining Docker risk/u);
	assert.match(routes, /\[routes\."node-code-change"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"/u);
	assert.match(routes, /\[routes\."bun-code-change"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"/u);
	assert.match(routes, /\[routes\."docker-code-change"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"/u);
	assert.match(manifest, /"\.mustflow\/skills\/node-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"\.mustflow\/skills\/bun-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"\.mustflow\/skills\/docker-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"node-code-change"/u);
	assert.match(manifest, /"bun-code-change"/u);
	assert.match(manifest, /"docker-code-change"/u);
	assert.match(i18n, /\[documents\."skill\.node-code-change"\]/u);
	assert.match(i18n, /\[documents\."skill\.bun-code-change"\]/u);
	assert.match(i18n, /\[documents\."skill\.docker-code-change"\]/u);
});

test('Tauri code change skill covers CSP bootstrap and IPC WebView traps', () => {
	const tauriSkill = readText('.mustflow/skills/tauri-code-change/SKILL.md');
	const templateTauriSkill = readText('templates/default/locales/en/.mustflow/skills/tauri-code-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(tauriSkill, templateTauriSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(tauriSkill, /CSP, WebView bootstrap HTML/u);
	assert.match(tauriSkill, /blank or black WebView/u);
	assert.match(tauriSkill, /Content Security Policy blocking the frontend bootstrap/u);
	assert.match(tauriSkill, /generated entry HTML/u);
	assert.match(tauriSkill, /SvelteKit may inject inline bootstrap scripts/u);
	assert.match(tauriSkill, /`script-src 'self'` can block the app before JavaScript starts/u);
	assert.match(tauriSkill, /nonce, hash, or externalized bootstrap/u);
	assert.match(tauriSkill, /`script-src 'self' 'unsafe-inline'` may be an explicit compatibility tradeoff/u);
	assert.match(tauriSkill, /does not also allow remote script origins, `unsafe-eval`, or wildcard script sources/u);
	assert.match(tauriSkill, /make `connect-src` explicit for the required IPC scheme or local origin/u);
	assert.match(tauriSkill, /Do not replace a specific IPC allowance with `connect-src \*`/u);
	assert.match(tauriSkill, /packaged WebView smoke, CSP violation/u);
	assert.match(skillIndex, /\.mustflow\/skills\/tauri-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /WebView\/native boundary drift/u);
	assert.match(routes, /\[routes\."tauri-code-change"\]\r?\ncategory = "data_external"\r?\nroute_type = "primary"/u);
	assert.match(manifest, /"\.mustflow\/skills\/tauri-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"tauri-code-change"/u);
	assert.match(i18n, /\[documents\."skill\.tauri-code-change"\][\s\S]*?revision = 3/u);
});

test('Go code change skill gates runtime, concurrency, JSON, HTTP, and toolchain traps by Go version', () => {
	const goSkill = readText('.mustflow/skills/go-code-change/SKILL.md');
	const templateGoSkill = readText('templates/default/locales/en/.mustflow/skills/go-code-change/SKILL.md');
	const freshnessSkill = readText('.mustflow/skills/version-freshness-check/SKILL.md');
	const templateFreshnessSkill = readText(
		'templates/default/locales/en/.mustflow/skills/version-freshness-check/SKILL.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(goSkill, templateGoSkill);
	assert.equal(freshnessSkill, templateFreshnessSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);

	assert.match(goSkill, /go` directive as a language and module compatibility switch/u);
	assert.match(goSkill, /`new\(expr\)`/u);
	assert.match(goSkill, /`errors\.AsType`/u);
	assert.match(goSkill, /`sync\.WaitGroup\.Go` only for tasks that do not return errors and must not panic/u);
	assert.match(goSkill, /errgroup-style boundary/u);
	assert.match(goSkill, /cancellation causes/u);
	assert.match(goSkill, /`context\.WithoutCancel` only for short bounded cleanup/u);
	assert.match(goSkill, /`context\.AfterFunc`/u);
	assert.match(goSkill, /http\.Client` and `http\.Server` timeouts/u);
	assert.match(goSkill, /reverse-proxy rewrite hooks/u);
	assert.match(goSkill, /`omitempty` versus `omitzero`/u);
	assert.match(goSkill, /`encoding\/json\/v2` and `jsontext` as experimental/u);
	assert.match(goSkill, /traversal-resistant root APIs/u);
	assert.match(goSkill, /`net\/netip`/u);
	assert.match(goSkill, /`net\.JoinHostPort`/u);
	assert.match(goSkill, /`GOMEMLIMIT` or `debug\.SetMemoryLimit`/u);
	assert.match(goSkill, /manual `GOMAXPROCS` pins in containers/u);
	assert.match(goSkill, /goroutine leak profiling/u);
	assert.match(goSkill, /`-race` only finds races on executed paths/u);
	assert.match(goSkill, /`testing\/synctest`/u);
	assert.match(goSkill, /`testing\.B\.Loop`/u);
	assert.match(goSkill, /`tool` directive over `tools\.go`/u);
	assert.match(goSkill, /`go fix` modernizers/u);

	assert.match(freshnessSkill, /Go release, toolchain, standard-library, runtime, or experiment references/u);
	assert.match(freshnessSkill, /official Go release notes or package documentation/u);
	assert.match(freshnessSkill, /expression operands to `new`/u);
	assert.match(freshnessSkill, /goroutine leak profiles/u);
	assert.match(freshnessSkill, /`GOEXPERIMENT` APIs/u);
	assert.match(skillIndex, /\.mustflow\/skills\/go-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /HTTP clients or servers, reverse proxies, JSON encoding/u);
	assert.match(skillIndex, /unsupported Go feature/u);
	assert.match(routes, /\[routes\."go-code-change"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"/u);
	assert.match(manifest, /"\.mustflow\/skills\/go-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"go-code-change"/u);
	assert.match(i18n, /\[documents\."skills\.index"\][\s\S]*?revision = 109/u);
	assert.match(i18n, /\[documents\."skill\.go-code-change"\][\s\S]*?revision = 3/u);
	assert.match(i18n, /\[documents\."skill\.version-freshness-check"\][\s\S]*?revision = 6/u);
});

test('Rust code change skill gates MSRV, ownership, Cargo, unsafe, and release-profile traps by Rust version', () => {
	const rustSkill = readText('.mustflow/skills/rust-code-change/SKILL.md');
	const templateRustSkill = readText('templates/default/locales/en/.mustflow/skills/rust-code-change/SKILL.md');
	const freshnessSkill = readText('.mustflow/skills/version-freshness-check/SKILL.md');
	const templateFreshnessSkill = readText(
		'templates/default/locales/en/.mustflow/skills/version-freshness-check/SKILL.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(rustSkill, templateRustSkill);
	assert.equal(freshnessSkill, templateFreshnessSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);

	assert.match(rustSkill, /`rust-version`, edition, `rust-toolchain\.toml`/u);
	assert.match(rustSkill, /1\.95\+ APIs such as `cfg_select!`, match `if let` guards, or `Vec::push_mut`/u);
	assert.match(rustSkill, /1\.96\+ APIs such as `assert_matches!` and `core::range`/u);
	assert.match(rustSkill, /guard patterns do not satisfy match exhaustiveness/u);
	assert.match(rustSkill, /Import it explicitly from `std` or `core`/u);
	assert.match(rustSkill, /`Arc::make_mut`/u);
	assert.match(rustSkill, /`LazyLock` for no-argument static lazy values/u);
	assert.match(rustSkill, /`OnceLock` when boot-time or test-time code supplies the value/u);
	assert.match(rustSkill, /`Cow<'_, str>`/u);
	assert.match(rustSkill, /query `HashMap<String, V>` with `&str`/u);
	assert.match(rustSkill, /`Option::take`, `take_if`, or `as_slice`/u);
	assert.match(rustSkill, /`ControlFlow`, `try_for_each`, or `try_fold`/u);
	assert.match(rustSkill, /`spare_capacity_mut`/u);
	assert.match(rustSkill, /avoid repeated `String::insert`/u);
	assert.match(rustSkill, /argument-position `impl Trait` removes caller turbofish control/u);
	assert.match(rustSkill, /implement `Deref` only for pointer-like wrappers/u);
	assert.match(rustSkill, /use GATs for borrowing iterator\/view traits/u);
	assert.match(rustSkill, /`workspace\.package`, `workspace\.dependencies`, `workspace\.lints`/u);
	assert.match(rustSkill, /`resolver = "2"`/u);
	assert.match(rustSkill, /Rust 2024 or when `unsafe_op_in_unsafe_fn` is enabled/u);
	assert.match(rustSkill, /`opt-level`, LTO, `panic`, `codegen-units`, and `strip`/u);

	assert.match(freshnessSkill, /Rust release, toolchain, standard-library, Cargo, edition, MSRV, lint, or target references/u);
	assert.match(freshnessSkill, /official Rust release notes, standard-library docs, the Cargo Book, Rust Reference, or rustc book/u);
	assert.match(freshnessSkill, /let chains, match `if let` guards, `cfg_select!`, `assert_matches!`, `core::range`, `Vec::push_mut`/u);
	assert.match(freshnessSkill, /Rust 2024 `unsafe_op_in_unsafe_fn`/u);
	assert.match(freshnessSkill, /Do not call a Rust 1\.95\+ or 1\.96\+ API a general Rust best practice/u);

	assert.match(skillIndex, /\.mustflow\/skills\/rust-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /unsupported Rust feature/u);
	assert.match(skillIndex, /Rust stable\/nightly\/MSRV confusion/u);
	assert.match(routes, /\[routes\."rust-code-change"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"/u);
	assert.match(manifest, /"\.mustflow\/skills\/rust-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"rust-code-change"/u);
	assert.match(i18n, /\[documents\."skills\.index"\][\s\S]*?revision = 109/u);
	assert.match(i18n, /\[documents\."skill\.rust-code-change"\][\s\S]*?revision = 4/u);
	assert.match(i18n, /\[documents\."skill\.version-freshness-check"\][\s\S]*?revision = 6/u);
});

test('TypeScript and dependency freshness skills distinguish stable compiler and native preview tracks', () => {
	const tsSkill = readText('.mustflow/skills/typescript-code-change/SKILL.md');
	const templateTsSkill = readText('templates/default/locales/en/.mustflow/skills/typescript-code-change/SKILL.md');
	const dependencySkill = readText('.mustflow/skills/dependency-upgrade-review/SKILL.md');
	const templateDependencySkill = readText(
		'templates/default/locales/en/.mustflow/skills/dependency-upgrade-review/SKILL.md',
	);
	const freshnessSkill = readText('.mustflow/skills/version-freshness-check/SKILL.md');
	const templateFreshnessSkill = readText(
		'templates/default/locales/en/.mustflow/skills/version-freshness-check/SKILL.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(tsSkill, templateTsSkill);
	assert.equal(dependencySkill, templateDependencySkill);
	assert.equal(freshnessSkill, templateFreshnessSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);

	assert.match(tsSkill, /TypeScript 6 transition deprecations/u);
	assert.match(tsSkill, /TypeScript 7 native preview comparison/u);
	assert.match(tsSkill, /`@typescript\/native-preview`/u);
	assert.match(tsSkill, /`tsgo`/u);
	assert.match(tsSkill, /`ignoreDeprecations` is a temporary compatibility valve/u);
	assert.match(tsSkill, /`--stableTypeOrdering` as a migration comparison tool/u);
	assert.match(tsSkill, /Keep existing `tsc` or framework typecheck as the compatibility baseline/u);
	assert.match(tsSkill, /Compiler API, transformer, language-service, or framework typecheck surfaces/u);

	assert.match(dependencySkill, /TypeScript compiler tracks/u);
	assert.match(dependencySkill, /stable `typescript` and `tsc`/u);
	assert.match(dependencySkill, /native preview via `@typescript\/native-preview` and `tsgo`/u);
	assert.match(dependencySkill, /Do not treat a native preview package as a stable replacement/u);
	assert.match(dependencySkill, /unsupported compiler API, transformer, language-service plugin/u);

	assert.match(freshnessSkill, /TypeScript compiler-track references/u);
	assert.match(freshnessSkill, /Do not call native preview output "latest stable TypeScript"/u);
	assert.match(freshnessSkill, /side-by-side comparison, beta testing, editor preview, or repository adoption/u);
	assert.match(freshnessSkill, /TypeScript 6 stable, TypeScript 7 beta\/native-preview/u);

	assert.match(skillIndex, /TypeScript 6-to-7 migration surfaces/u);
	assert.match(skillIndex, /native-preview over-adoption/u);
	assert.match(skillIndex, /TypeScript beta\/native-preview track confusion/u);
	assert.match(
		routes,
		/\[routes\."typescript-code-change"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"\r?\npriority = 85\r?\napplies_to_reasons = \["code_change", "public_api_change", "test_change", "package_metadata_change"\]/u,
	);
	assert.match(i18n, /\[documents\."skill\.typescript-code-change"\][\s\S]*?revision = 3/u);
	assert.match(i18n, /\[documents\."skill\.dependency-upgrade-review"\][\s\S]*?revision = 3/u);
	assert.match(i18n, /\[documents\."skill\.version-freshness-check"\][\s\S]*?revision = 6/u);
});

test('PowerShell code change skill keeps quoting, parser layers, and native argv explicit', () => {
	const localSkill = readText('.mustflow/skills/powershell-code-change/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/powershell-code-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /parser layering/u);
	assert.match(localSkill, /PowerShell expression or argument mode/u);
	assert.match(localSkill, /native program parser/u);
	assert.match(localSkill, /single-quoted strings for literal values/u);
	assert.match(localSkill, /double-quoted strings only when variable or subexpression expansion is required/u);
	assert.match(localSkill, /subexpressions for member access/u);
	assert.match(localSkill, /`\$\{name\}`/u);
	assert.match(localSkill, /single-quoted here-strings/u);
	assert.match(localSkill, /Avoid line-ending backticks/u);
	assert.match(localSkill, /splatting/u);
	assert.match(localSkill, /Use `--` only/u);
	assert.match(localSkill, /Use `--%` only as a narrow Windows-native stop-parsing fallback/u);
	assert.match(localSkill, /outer quotation marks are normally consumed/u);
	assert.match(localSkill, /Build native command arguments as arrays/u);
	assert.match(localSkill, /call operator/u);
	assert.match(localSkill, /\$PSNativeCommandArgumentPassing/u);
	assert.match(localSkill, /Prefer direct native invocation over `Start-Process`/u);
	assert.match(localSkill, /Do not use `Invoke-Expression`/u);
	assert.match(localSkill, /regex, wildcard, and replacement operations/u);
	assert.match(localSkill, /Prefer `-File`, stdin, or an encoded command/u);
	assert.match(localSkill, /command-injection risk/u);
	assert.match(skillIndex, /\.mustflow\/skills\/powershell-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /parser-layer confusion, quote loss/u);
	assert.match(routes, /\[routes\."powershell-code-change"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"/u);
	assert.match(routes, /applies_to_reasons = \["code_change", "test_change", "docs_change", "package_metadata_change", "workflow_change"\]/u);
	assert.match(manifest, /"\.mustflow\/skills\/powershell-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"powershell-code-change"/u);
	assert.match(i18n, /\[documents\."skills\.index"\][\s\S]*?revision = 109/u);
	assert.match(i18n, /\[documents\."skill\.powershell-code-change"\][\s\S]*?revision = 1/u);
});

test('HTTP delivery streaming skill keeps compression and browser transports explicit', () => {
	const deliverySkill = readText('.mustflow/skills/http-delivery-streaming/SKILL.md');
	const templateDeliverySkill = readText('templates/default/locales/en/.mustflow/skills/http-delivery-streaming/SKILL.md');
	const apiSkill = readText('.mustflow/skills/api-contract-change/SKILL.md');
	const templateApiSkill = readText('templates/default/locales/en/.mustflow/skills/api-contract-change/SKILL.md');
	const performanceSkill = readText('.mustflow/skills/performance-budget-check/SKILL.md');
	const templatePerformanceSkill = readText(
		'templates/default/locales/en/.mustflow/skills/performance-budget-check/SKILL.md',
	);
	const adapterSkill = readText('.mustflow/skills/adapter-boundary/SKILL.md');
	const templateAdapterSkill = readText('templates/default/locales/en/.mustflow/skills/adapter-boundary/SKILL.md');
	const freshnessSkill = readText('.mustflow/skills/version-freshness-check/SKILL.md');
	const templateFreshnessSkill = readText(
		'templates/default/locales/en/.mustflow/skills/version-freshness-check/SKILL.md',
	);
	const authSkill = readText('.mustflow/skills/auth-permission-change/SKILL.md');
	const templateAuthSkill = readText('templates/default/locales/en/.mustflow/skills/auth-permission-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(deliverySkill, templateDeliverySkill);
	assert.equal(apiSkill, templateApiSkill);
	assert.equal(performanceSkill, templatePerformanceSkill);
	assert.equal(adapterSkill, templateAdapterSkill);
	assert.equal(freshnessSkill, templateFreshnessSkill);
	assert.equal(authSkill, templateAuthSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);

	assert.match(deliverySkill, /Content-Encoding/u);
	assert.match(deliverySkill, /Vary: Accept-Encoding/u);
	assert.match(deliverySkill, /compression dictionary transport/u);
	assert.match(deliverySkill, /Server-Sent Events/u);
	assert.match(deliverySkill, /EventSource/u);
	assert.match(deliverySkill, /proxy buffering/u);
	assert.match(deliverySkill, /WebTransport/u);
	assert.match(deliverySkill, /datagrams only for lossy latest-state/u);
	assert.match(deliverySkill, /WebSocket, SSE, or long-poll fallback/u);
	assert.match(deliverySkill, /delivery ledger/u);

	assert.match(apiSkill, /http-delivery-streaming/u);
	assert.match(apiSkill, /content negotiation/u);
	assert.match(apiSkill, /streaming flush/u);
	assert.match(performanceSkill, /false compression win/u);
	assert.match(performanceSkill, /buffered stream latency/u);
	assert.match(adapterSkill, /WebTransport streams, datagrams/u);
	assert.match(adapterSkill, /fallback transport names/u);
	assert.match(freshnessSkill, /HTTP standard or browser-support references/u);
	assert.match(freshnessSkill, /WebTransport, compression dictionary transport, zstd content coding/u);
	assert.match(authSkill, /credentialed EventSource\/SSE streams/u);
	assert.match(authSkill, /CDN\/proxy cache keys/u);

	assert.match(skillIndex, /\.mustflow\/skills\/http-delivery-streaming\/SKILL\.md/u);
	assert.match(skillIndex, /wrong content decoding, cache poisoning/u);
	assert.match(routes, /\[routes\."http-delivery-streaming"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"/u);
	assert.match(routes, /applies_to_reasons = \["code_change", "behavior_change", "public_api_change", "performance_change", "security_change", "privacy_change", "docs_change", "test_change", "package_metadata_change", "release_risk"\]/u);
	assert.match(manifest, /"\.mustflow\/skills\/http-delivery-streaming\/SKILL\.md"/u);
	assert.match(manifest, /"http-delivery-streaming"/u);
	assert.match(i18n, /\[documents\."skills\.index"\][\s\S]*?revision = 109/u);
	assert.match(i18n, /\[documents\."skill\.http-delivery-streaming"\][\s\S]*?revision = 1/u);
	assert.match(i18n, /\[documents\."skill\.api-contract-change"\][\s\S]*?revision = 2/u);
	assert.match(i18n, /\[documents\."skill\.adapter-boundary"\][\s\S]*?revision = 12/u);
	assert.match(i18n, /\[documents\."skill\.performance-budget-check"\][\s\S]*?revision = 20/u);
	assert.match(i18n, /\[documents\."skill\.version-freshness-check"\][\s\S]*?revision = 6/u);
	assert.match(i18n, /\[documents\."skill\.auth-permission-change"\][\s\S]*?revision = 2/u);
});

test('backend reliability skill keeps retry, idempotency, health, cache, and queue traps explicit', () => {
	const localSkill = readText('.mustflow/skills/backend-reliability-change/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/backend-reliability-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /idempotency ledger/u);
	assert.match(localSkill, /same key with a different request fingerprint/u);
	assert.match(localSkill, /end-to-end deadline/u);
	assert.match(localSkill, /connect, request, read, and write timeouts/u);
	assert.match(localSkill, /exponential backoff, jitter, and a retry budget/u);
	assert.match(localSkill, /put database, cache, or external-provider checks in liveness/u);
	assert.match(localSkill, /`\/live` shallow/u);
	assert.match(localSkill, /`\/ready` only/u);
	assert.match(localSkill, /`\/startup` or an equivalent startup probe/u);
	assert.match(localSkill, /unique constraint or unique index/u);
	assert.match(localSkill, /partial unique index/u);
	assert.match(localSkill, /`EXPLAIN ANALYZE` with buffer evidence/u);
	assert.match(localSkill, /stable compound cursor/u);
	assert.match(localSkill, /low-cardinality/u);
	assert.match(localSkill, /Do not put secrets, tokens, raw request bodies/u);
	assert.match(localSkill, /OpenTelemetry baggage/u);
	assert.match(localSkill, /same correlation\s+or trace id/u);
	assert.match(localSkill, /request coalescing/u);
	assert.match(localSkill, /TTL jitter/u);
	assert.match(localSkill, /negative caching/u);
	assert.match(localSkill, /inbox table/u);
	assert.match(localSkill, /outbox pattern/u);
	assert.match(localSkill, /`FOR UPDATE SKIP LOCKED`/u);
	assert.match(localSkill, /distributed locks as a last resort/u);
	assert.match(localSkill, /object-level authorization/u);
	assert.match(localSkill, /allowlisted DTOs/u);
	assert.match(localSkill, /server-side feature flags/u);
	assert.match(localSkill, /kill switch/u);
	assert.match(skillIndex, /\.mustflow\/skills\/backend-reliability-change\/SKILL\.md/u);
	assert.match(skillIndex, /remaining backend reliability risk/u);
	assert.match(routes, /\[routes\."backend-reliability-change"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"/u);
	assert.match(
		routes,
		/applies_to_reasons = \["code_change", "behavior_change", "public_api_change", "data_change", "migration_change", "performance_change", "security_change", "privacy_change", "docs_change", "test_change", "package_metadata_change", "release_risk"\]/u,
	);
	assert.match(manifest, /"\.mustflow\/skills\/backend-reliability-change\/SKILL\.md"/u);
	assert.match(manifest, /"backend-reliability-change"/u);
	assert.match(i18n, /\[documents\."skills\.index"\][\s\S]*?revision = 109/u);
	assert.match(i18n, /\[documents\."skill\.backend-reliability-change"\][\s\S]*?revision = 1/u);
});

test('Python skills gate standard-library APIs and runtime upgrade defaults by supported version', () => {
	const pythonSkill = readText('.mustflow/skills/python-code-change/SKILL.md');
	const templatePythonSkill = readText('templates/default/locales/en/.mustflow/skills/python-code-change/SKILL.md');
	const dependencySkill = readText('.mustflow/skills/dependency-upgrade-review/SKILL.md');
	const templateDependencySkill = readText(
		'templates/default/locales/en/.mustflow/skills/dependency-upgrade-review/SKILL.md',
	);
	const freshnessSkill = readText('.mustflow/skills/version-freshness-check/SKILL.md');
	const templateFreshnessSkill = readText(
		'templates/default/locales/en/.mustflow/skills/version-freshness-check/SKILL.md',
	);
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(pythonSkill, templatePythonSkill);
	assert.equal(dependencySkill, templateDependencySkill);
	assert.equal(freshnessSkill, templateFreshnessSkill);

	assert.match(pythonSkill, /standard-library feature usage/u);
	assert.match(pythonSkill, /Python 3\.14\+ `map\(strict=True\)`/u);
	assert.match(pythonSkill, /`itertools\.batched\(\.\.\., strict=True\)`/u);
	assert.match(pythonSkill, /`functools\.cache`, `lru_cache`, `cached_property`, `partial`, and Python 3\.14\+ `Placeholder`/u);
	assert.match(pythonSkill, /archive extraction, including `tarfile`/u);
	assert.match(pythonSkill, /Interpreter or library diagnostics such as import timing, `tracemalloc`, `faulthandler`/u);

	assert.match(freshnessSkill, /Python standard-library\/API references/u);
	assert.match(freshnessSkill, /Python 3\.14\+ standard-library APIs/u);
	assert.match(freshnessSkill, /official Python documentation/u);
	assert.match(freshnessSkill, /Python 3\.14\+ `map\(strict=True\)`/u);
	assert.match(freshnessSkill, /`functools\.Placeholder`/u);
	assert.match(freshnessSkill, /`heapq` max-heap helpers/u);

	assert.match(dependencySkill, /Python runtime support/u);
	assert.match(dependencySkill, /Python runtime upgrades/u);
	assert.match(dependencySkill, /standard-library API availability/u);
	assert.match(dependencySkill, /changed defaults/u);
	assert.match(dependencySkill, /archive extraction, subprocess handling, async lifecycle/u);

	assert.match(i18n, /\[documents\."skill\.python-code-change"\][\s\S]*?revision = 3/u);
	assert.match(i18n, /\[documents\."skill\.dependency-upgrade-review"\][\s\S]*?revision = 3/u);
	assert.match(i18n, /\[documents\."skill\.version-freshness-check"\][\s\S]*?revision = 6/u);
});

test('clarifying question gate keeps blocking questions evidence-based and bounded', () => {
	const localSkill = readText('.mustflow/skills/clarifying-question-gate/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/clarifying-question-gate/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /Ask only the questions that protect the work from expensive wrong assumptions/u);
	assert.match(localSkill, /repository_answerable/u);
	assert.match(localSkill, /safe_assumption/u);
	assert.match(localSkill, /blocking_question/u);
	assert.match(localSkill, /ask at most three questions at once/u);
	assert.match(localSkill, /Do not ask the user to answer facts that the\s+codebase can answer/u);
	assert.match(localSkill, /"should I add tests\?"/u);
	assert.match(skillIndex, /\.mustflow\/skills\/clarifying-question-gate\/SKILL\.md/u);
	assert.match(skillIndex, /cannot be safely inferred from repository evidence/u);
	assert.match(routes, /\[routes\."clarifying-question-gate"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /applies_to_reasons = \["unknown_change", "code_change", "behavior_change", "public_api_change", "security_change", "privacy_change", "data_change", "migration_change", "package_metadata_change"\]/u);
	assert.match(manifest, /"\.mustflow\/skills\/clarifying-question-gate\/SKILL\.md"/u);
	assert.match(manifest, /"clarifying-question-gate"/u);
});

test('structure discovery gate keeps pre-implementation design questions bounded', () => {
	const localSkill = readText('.mustflow/skills/structure-discovery-gate/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/structure-discovery-gate/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /pre-implementation design gate/u);
	assert.match(localSkill, /simple_patch/u);
	assert.match(localSkill, /bounded_feature/u);
	assert.match(localSkill, /structural_change/u);
	assert.match(localSkill, /risk_change/u);
	assert.match(localSkill, /four sentences or fewer/u);
	assert.match(localSkill, /observable success criteria and verification proof/u);
	assert.match(localSkill, /actor roles, tenant or ownership boundaries, and server-side authorization/u);
	assert.match(localSkill, /failure mode, retry, idempotency, partial success, rollback/u);
	assert.match(localSkill, /Ask only questions whose answers can change the design/u);
	assert.match(skillIndex, /pre-implementation design gate/u);
	assert.match(skillIndex, /design gate classification, restated requirement, success criteria/u);
	assert.match(routes, /\[routes\."structure-discovery-gate"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"/u);
	assert.match(routes, /applies_to_reasons = \["code_change", "unknown_change", "behavior_change", "public_api_change", "security_change", "data_change", "migration_change", "product_change"\]/u);
});

test('repro-first debug skill keeps diagnosis loop boundaries explicit', () => {
	const localSkill = readText('.mustflow/skills/repro-first-debug/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/repro-first-debug/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /three to five plausible hypotheses/u);
	assert.match(localSkill, /unique marker/u);
	assert.match(localSkill, /Re-run the original reproduction path/u);
	assert.match(localSkill, /Temporary instrumentation and debug output are removed/u);
	assert.match(skillIndex, /hypotheses, observations, fix, original reproduction rerun/u);
});

test('vertical slice TDD skill stays explicitly triggered and template-synced', () => {
	const localSkill = readText('.mustflow/skills/vertical-slice-tdd/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/vertical-slice-tdd/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /TDD is explicitly requested/u);
	assert.match(localSkill, /one vertical behavior slice/u);
	assert.match(localSkill, /`behavior_red` is the only valid behavior RED/u);
	assert.match(localSkill, /Refactor only after GREEN/u);
	assert.match(localSkill, /Invalid RED and scaffold-only RED are not reported as behavior coverage/u);
	assert.match(skillIndex, /one observable behavior slice at a time/u);
	assert.match(skillIndex, /remaining TDD risk/u);
});

test('ui quality gate folds external UI review lessons into mustflow boundaries', () => {
	const localSkill = readText('.mustflow/skills/ui-quality-gate/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/ui-quality-gate/SKILL.md');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /task-essential controls/u);
	assert.match(localSkill, /vibe-coded UI/u);
	assert.match(localSkill, /style drift/u);
	assert.match(localSkill, /visual hierarchy/u);
	assert.match(localSkill, /touch targets/u);
	assert.match(localSkill, /keyboard and focus/u);
	assert.match(localSkill, /accessible names and states/u);
	assert.match(localSkill, /form validation/u);
	assert.match(localSkill, /micro-interaction feedback/u);
	assert.match(localSkill, /visual geometry/u);
	assert.match(localSkill, /wrapper size, intrinsic SVG or glyph box/u);
	assert.match(localSkill, /`min-width: 0` or equivalent flex\/grid constraint/u);
	assert.match(localSkill, /filtered empty, search empty, permission denied, quota/u);
	assert.match(localSkill, /Search, filters, sorting, pagination/u);
	assert.match(localSkill, /dirty state, autosave, optimistic updates, undo/u);
	assert.match(localSkill, /collision and overflow handling/u);
	assert.match(localSkill, /state architecture/u);
	assert.match(localSkill, /dependency and API reality/u);
	assert.match(localSkill, /high-risk widgets/u);
	assert.match(localSkill, /view tree, data contract, interaction model, state model, geometry contract/u);
	assert.match(localSkill, /component boundaries/u);
	assert.match(localSkill, /text overlap/u);
	assert.match(localSkill, /localization-safe labels/u);
	assert.match(localSkill, /performance and asset-size/u);
	assert.match(localSkill, /configured one-shot command or approved browser workflow/u);
	assert.match(localSkill, /Do not start development servers, watchers, or browser sessions directly/u);
});

test('frontend render stability keeps flicker diagnosis symptom-first and template-synced', () => {
	const localSkill = readText('.mustflow/skills/frontend-render-stability/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/frontend-render-stability/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /document navigation, theme or CSS application, hydration/u);
	assert.match(localSkill, /Prove or rule out a full document reload/u);
	assert.match(localSkill, /`data-astro-reload`/u);
	assert.match(localSkill, /`transition:persist`/u);
	assert.match(localSkill, /`astro:before-swap` or `astro:after-swap`/u);
	assert.match(localSkill, /`data-sveltekit-reload`/u);
	assert.match(localSkill, /`data-sveltekit-preload-data` or `data-sveltekit-preload-code`/u);
	assert.match(localSkill, /`onNavigate` view-transition/u);
	assert.match(localSkill, /Do not rely on component mount or a late store subscription/u);
	assert.match(localSkill, /CSP/u);
	assert.match(localSkill, /avoid duplicate rendered `view-transition-name` values/u);
	assert.match(localSkill, /BFCache/u);
	assert.match(localSkill, /abort stale requests/u);
	assert.match(localSkill, /Pointer Events/u);
	assert.match(localSkill, /passive event listeners/u);
	assert.match(localSkill, /Native browser contracts are preserved/u);
	assert.match(localSkill, /Do not migrate frameworks, disable SSR, convert the app to an SPA/u);
	assert.match(skillIndex, /\.mustflow\/skills\/frontend-render-stability\/SKILL\.md/u);
	assert.match(skillIndex, /remaining render-stability risk/u);
	assert.match(routes, /\[routes\."frontend-render-stability"\]\r?\ncategory = "ui_assets"\r?\nroute_type = "primary"/u);
	assert.match(
		routes,
		/applies_to_reasons = \["ui_change", "performance_change", "behavior_change", "code_change"\]/u,
	);
	assert.match(manifest, /"\.mustflow\/skills\/frontend-render-stability\/SKILL\.md"/u);
	assert.match(manifest, /"frontend-render-stability"/u);
	assert.match(i18n, /\[documents\."skill\.frontend-render-stability"\]/u);
});

test('utility and browser-native styling skills cover modern extraction and platform traps', () => {
	const tailwindSkill = readText('.mustflow/skills/tailwind-code-change/SKILL.md');
	const templateTailwindSkill = readText('templates/default/locales/en/.mustflow/skills/tailwind-code-change/SKILL.md');
	const unocssSkill = readText('.mustflow/skills/unocss-code-change/SKILL.md');
	const templateUnocssSkill = readText('templates/default/locales/en/.mustflow/skills/unocss-code-change/SKILL.md');
	const cssSkill = readText('.mustflow/skills/css-code-change/SKILL.md');
	const templateCssSkill = readText('templates/default/locales/en/.mustflow/skills/css-code-change/SKILL.md');
	const htmlSkill = readText('.mustflow/skills/html-code-change/SKILL.md');
	const templateHtmlSkill = readText('templates/default/locales/en/.mustflow/skills/html-code-change/SKILL.md');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(tailwindSkill, templateTailwindSkill);
	assert.equal(unocssSkill, templateUnocssSkill);
	assert.equal(cssSkill, templateCssSkill);
	assert.equal(htmlSkill, templateHtmlSkill);

	assert.match(tailwindSkill, /CSS-first configuration/u);
	assert.match(tailwindSkill, /`@source inline`/u);
	assert.match(tailwindSkill, /`@source not inline`/u);
	assert.match(tailwindSkill, /`source\(none\)`/u);
	assert.match(tailwindSkill, /`@reference`/u);
	assert.match(tailwindSkill, /`space-\*`/u);
	assert.match(tailwindSkill, /`dvh`, `svh`, or `lvh`/u);

	assert.match(unocssSkill, /Wind4 migration/u);
	assert.match(unocssSkill, /`presetWind4`/u);
	assert.match(unocssSkill, /`extendTheme`/u);
	assert.match(unocssSkill, /`content\.pipeline\.include`/u);
	assert.match(unocssSkill, /`@unocss-include`/u);
	assert.match(unocssSkill, /`FileSystemIconLoader`/u);
	assert.match(unocssSkill, /Shadow DOM and web component styles/u);

	assert.match(cssSkill, /`:where`/u);
	assert.match(cssSkill, /`:has`/u);
	assert.match(cssSkill, /container queries/u);
	assert.match(cssSkill, /`content-visibility`/u);
	assert.match(cssSkill, /`contain-intrinsic-size`/u);
	assert.match(cssSkill, /`color-scheme`/u);

	assert.match(htmlSkill, /popovers/u);
	assert.match(htmlSkill, /native constraint validation/u);
	assert.match(htmlSkill, /`inputmode`/u);
	assert.match(htmlSkill, /`enterkeyhint`/u);
	assert.match(htmlSkill, /inert background/u);

	assert.match(i18n, /\[documents\."skill\.tailwind-code-change"\]\r?\nsource = "locales\/en\/\.mustflow\/skills\/tailwind-code-change\/SKILL\.md"\r?\nsource_locale = "en"\r?\nrevision = 3/u);
	assert.match(i18n, /\[documents\."skill\.unocss-code-change"\]\r?\nsource = "locales\/en\/\.mustflow\/skills\/unocss-code-change\/SKILL\.md"\r?\nsource_locale = "en"\r?\nrevision = 3/u);
	assert.match(i18n, /\[documents\."skill\.css-code-change"\]\r?\nsource = "locales\/en\/\.mustflow\/skills\/css-code-change\/SKILL\.md"\r?\nsource_locale = "en"\r?\nrevision = 3/u);
	assert.match(i18n, /\[documents\."skill\.html-code-change"\]\r?\nsource = "locales\/en\/\.mustflow\/skills\/html-code-change\/SKILL\.md"\r?\nsource_locale = "en"\r?\nrevision = 3/u);
});

test('service boundary architecture keeps large-system boundaries ownership-first and template-synced', () => {
	const localSkill = readText('.mustflow/skills/service-boundary-architecture/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/service-boundary-architecture/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /Start by identifying ownership and failure pressure/u);
	assert.match(localSkill, /source of truth/u);
	assert.match(localSkill, /Split first by reason to change, not by noun/u);
	assert.match(localSkill, /Reject shared database ownership/u);
	assert.match(localSkill, /Design failure flows before the happy path/u);
	assert.match(localSkill, /Require idempotency/u);
	assert.match(localSkill, /Treat queues as storage and backpressure/u);
	assert.match(localSkill, /Treat caches as a consistency tradeoff/u);
	assert.match(localSkill, /past-tense fact events/u);
	assert.match(localSkill, /Tenant ID must travel/u);
	assert.match(localSkill, /p95, p99, error rate, queue age/u);
	assert.match(localSkill, /manual changes with audit and approval/u);
	assert.match(skillIndex, /\.mustflow\/skills\/service-boundary-architecture\/SKILL\.md/u);
	assert.match(skillIndex, /remaining service-boundary risk/u);
	assert.match(routes, /\[routes\."service-boundary-architecture"\]\r?\ncategory = "architecture_patterns"\r?\nroute_type = "primary"/u);
	assert.match(manifest, /"\.mustflow\/skills\/service-boundary-architecture\/SKILL\.md"/u);
	assert.match(manifest, /"service-boundary-architecture"/u);
	assert.match(i18n, /\[documents\."skill\.service-boundary-architecture"\]/u);
});

test('llm service UX review captures controllable AI interaction states', () => {
	const localSkill = readText('.mustflow/skills/llm-service-ux-review/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/llm-service-ux-review/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /prompt composer/u);
	assert.match(localSkill, /streaming response/u);
	assert.match(localSkill, /Clickable citations should appear only for sources actually used/u);
	assert.match(localSkill, /stop or cancel/u);
	assert.match(localSkill, /automation bias/u);
	assert.match(localSkill, /auto-scroll should pause/u);
	assert.match(localSkill, /non-AI or manual path/u);
	assert.match(localSkill, /exact passage links or previews/u);
	assert.match(localSkill, /avoid resending unnecessary history/u);
	assert.match(localSkill, /Conversation history, current thread, summarized context, and new-chat behavior/u);
	assert.match(localSkill, /Do not expose hidden reasoning/u);
	assert.match(skillIndex, /\.mustflow\/skills\/llm-service-ux-review\/SKILL\.md/u);
	assert.match(skillIndex, /remaining LLM UX risk/u);
});

test('search ad content authoring keeps monetized content reader-first', () => {
	const localSkill = readText('.mustflow/skills/search-ad-content-authoring/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/search-ad-content-authoring/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /search-oriented content/u);
	assert.match(localSkill, /AdSense, Ezoic, Raptive, Mediavine/u);
	assert.match(localSkill, /one to three focused sentences per paragraph/u);
	assert.match(localSkill, /Do not promise search rankings/u);
	assert.match(localSkill, /ad-slot filler/u);
	assert.match(localSkill, /RPM formulas, network thresholds, revenue estimates/u);
	assert.match(localSkill, /Do not treat exact word counts, heading counts, paragraph counts/u);
	assert.match(localSkill, /site-specific editorial defaults/u);
	assert.match(localSkill, /number or claim, interpretation, then limitation/u);
	assert.match(localSkill, /never make ads look like menus, downloads, recommendations, or content actions/u);
	assert.match(localSkill, /structured data aligned with the article body/u);
	assert.match(localSkill, /Do not recommend delaying the reader's primary answer/u);
	assert.match(localSkill, /uncloseable or deceptive sticky ads/u);
	assert.match(localSkill, /semantic content structure/u);
	assert.match(localSkill, /Real paragraphs, headings, figures/u);
	assert.match(localSkill, /do not introduce new claims in the conclusion/u);
	assert.match(localSkill, /reserve layout space/u);
	assert.match(localSkill, /Three to five concise FAQs/u);
	assert.match(localSkill, /source-freshness-check/u);
	assert.match(skillIndex, /\.mustflow\/skills\/search-ad-content-authoring\/SKILL\.md/u);
	assert.match(skillIndex, /remaining content risk/u);
});

test('execution contract skills stay template-synced and authority-bounded', () => {
	const commandContractSkill = readText('.mustflow/skills/command-contract-authoring/SKILL.md');
	const commandContractTemplate = readText(
		'templates/default/locales/en/.mustflow/skills/command-contract-authoring/SKILL.md',
	);
	const cliOutputSkill = readText('.mustflow/skills/cli-output-contract-review/SKILL.md');
	const cliOutputTemplate = readText(
		'templates/default/locales/en/.mustflow/skills/cli-output-contract-review/SKILL.md',
	);
	const filesystemSkill = readText('.mustflow/skills/cross-platform-filesystem-safety/SKILL.md');
	const filesystemTemplate = readText(
		'templates/default/locales/en/.mustflow/skills/cross-platform-filesystem-safety/SKILL.md',
	);
	const filePathSkill = readText('.mustflow/skills/file-path-cross-platform-change/SKILL.md');
	const filePathTemplate = readText(
		'templates/default/locales/en/.mustflow/skills/file-path-cross-platform-change/SKILL.md',
	);
	const lineEndingSkill = readText('.mustflow/skills/line-ending-hygiene/SKILL.md');
	const lineEndingTemplate = readText('templates/default/locales/en/.mustflow/skills/line-ending-hygiene/SKILL.md');
	const processSkill = readText('.mustflow/skills/process-execution-safety/SKILL.md');
	const processTemplate = readText('templates/default/locales/en/.mustflow/skills/process-execution-safety/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');

	assert.equal(commandContractSkill, commandContractTemplate);
	assert.equal(cliOutputSkill, cliOutputTemplate);
	assert.equal(filesystemSkill, filesystemTemplate);
	assert.equal(filePathSkill, filePathTemplate);
	assert.equal(lineEndingSkill, lineEndingTemplate);
	assert.equal(processSkill, processTemplate);
	assert.match(commandContractSkill, /\.mustflow\/config\/commands\.toml/u);
	assert.match(commandContractSkill, /only runnable command-authority surface/u);
	assert.match(cliOutputSkill, /exit-code meaning/u);
	assert.match(cliOutputSkill, /schema-backed reports/u);
	assert.match(cliOutputSkill, /stdout\/stderr routing/u);
	assert.match(cliOutputSkill, /terminal versus piped behavior/u);
	assert.match(cliOutputSkill, /terminal color codes, progress spinners, cursor controls/u);
	assert.match(cliOutputSkill, /Numbers should remain numbers/u);
	assert.match(cliOutputSkill, /timestamp format/u);
	assert.match(cliOutputSkill, /pipe-oriented output/u);
	assert.match(cliOutputSkill, /command tree, router or help metadata/u);
	assert.match(cliOutputSkill, /global flags/u);
	assert.match(cliOutputSkill, /JSONL/u);
	assert.match(cliOutputSkill, /Prompts must be avoidable/u);
	assert.match(cliOutputSkill, /repository-declared exit-code map/u);
	assert.match(cliOutputSkill, /0 to 255 range/u);
	assert.match(cliOutputSkill, /semantic schema diff/u);
	assert.match(cliOutputSkill, /snapshot or golden-output tests/u);
	assert.match(cliOutputSkill, /Snapshot updates require explicit review/u);
	assert.match(cliOutputSkill, /Do not introduce a new CLI test framework/u);
	assert.match(filesystemSkill, /symlink escapes/u);
	assert.match(filesystemSkill, /Windows and POSIX/u);
	assert.match(filesystemSkill, /Windows reserved names/u);
	assert.match(filesystemSkill, /null bytes/u);
	assert.match(filesystemSkill, /Do not lowercase paths as a universal containment strategy/u);
	assert.match(filesystemSkill, /time-of-check to time-of-use/u);
	assert.match(filesystemSkill, /same-directory temporary-file/u);
	assert.match(filesystemSkill, /POSIX rename semantics, Windows replacement behavior/u);
	assert.match(filesystemSkill, /least-privilege creation permissions/u);
	assert.match(filesystemSkill, /Unicode normalization for validation only/u);
	assert.match(filesystemSkill, /Windows namespace prefixes/u);
	assert.match(filesystemSkill, /alternate data streams/u);
	assert.match(filesystemSkill, /reparse points or junctions/u);
	assert.match(filesystemSkill, /partial path traversal/u);
	assert.match(filesystemSkill, /same volume/u);
	assert.match(filesystemSkill, /parent directory fsync/u);
	assert.match(filesystemSkill, /Do not claim operating-system mitigations/u);
	assert.match(filesystemSkill, /clone or checkout materialization/u);
	assert.match(filesystemSkill, /per-invocation `core\.longpaths=true`/u);
	assert.match(filesystemSkill, /POSIX `ENAMETOOLONG`/u);
	assert.match(filesystemSkill, /filename_too_long/u);
	assert.match(filesystemSkill, /Preserve bounded diagnostic evidence/u);
	assert.match(filesystemSkill, /global Git config/u);
	assert.match(filesystemSkill, /plain-text symlink stubs/u);
	assert.match(filesystemSkill, /byte_limit_exceeded/u);
	assert.match(filesystemSkill, /preflight -> dangerous operation -> classifier -> safe cleanup/u);
	assert.match(filesystemSkill, /app-owned staging directory/u);
	assert.match(filesystemSkill, /Do not delete a user-selected final destination/u);
	assert.match(filesystemSkill, /inotify watch limit rather than a full disk/u);
	assert.match(filePathSkill, /clone or checkout destinations/u);
	assert.match(filePathSkill, /repository clone or checkout destinations/u);
	assert.match(filePathSkill, /path_too_long/u);
	assert.match(filePathSkill, /watcher_limit/u);
	assert.match(filePathSkill, /clone checkout failure classification/u);
	assert.match(filePathSkill, /classify filesystem and platform causes before network or auth causes/u);
	assert.match(filePathSkill, /byte-budget proof/u);
	assert.match(filePathSkill, /fullwidth-convert/u);
	assert.match(filePathSkill, /byte_limit_exceeded/u);
	assert.match(filePathSkill, /preflight -> dangerous operation -> classifier -> safe cleanup/u);
	assert.match(filePathSkill, /fetch repository metadata into an app-owned staging area/u);
	assert.match(filePathSkill, /Do not clone, extract, scaffold, or install directly/u);
	assert.match(filePathSkill, /user-selected final folder/u);
	assert.match(lineEndingSkill, /Docker or shell scripts fail with CRLF interpreter errors/u);
	assert.match(lineEndingSkill, /Do not create `\.gitattributes`/u);
	assert.match(lineEndingSkill, /repository-wide renormalization/u);
	assert.match(lineEndingSkill, /bad interpreter/u);
	assert.match(processSkill, /process-tree cleanup/u);
	assert.match(processSkill, /Do not finalize a receipt/u);
	assert.match(processSkill, /Git clone or checkout/u);
	assert.match(processSkill, /filesystem\/path/u);
	assert.match(processSkill, /Do not classify a Git checkout path failure as network/u);
	assert.match(processSkill, /Preserve bounded stdout\/stderr tails/u);
	assert.match(processSkill, /registry edits, global Git config/u);
	assert.match(processSkill, /environment repair as a separate setup workflow/u);
	assert.match(processSkill, /Do not build `exec\("long command string"\)`/u);
	assert.match(processSkill, /stdin or an owned temporary file/u);
	assert.match(processSkill, /argv_too_long/u);
	assert.match(processSkill, /shell_command_too_long/u);
	assert.match(processSkill, /path\.win32/u);
	assert.match(processSkill, /path\.posix/u);
	assert.match(processSkill, /app-owned staging area/u);
	assert.match(skillIndex, /\.mustflow\/skills\/command-contract-authoring\/SKILL\.md/u);
	assert.match(skillIndex, /\.mustflow\/skills\/cli-output-contract-review\/SKILL\.md/u);
	assert.match(skillIndex, /\.mustflow\/skills\/file-path-cross-platform-change\/SKILL\.md/u);
	assert.match(skillIndex, /\.mustflow\/skills\/cross-platform-filesystem-safety\/SKILL\.md/u);
	assert.match(skillIndex, /\.mustflow\/skills\/line-ending-hygiene\/SKILL\.md/u);
	assert.match(skillIndex, /\.mustflow\/skills\/process-execution-safety\/SKILL\.md/u);
	assert.match(skillIndex, /Git checkout path failure misreported as network or auth/u);
	assert.match(skillIndex, /user-selected destination deletion/u);
	assert.match(skillIndex, /command-line length limits/u);
	assert.match(skillIndex, /hidden repository-wide policy change/u);
});

test('security skills cover AI-generated code and supply-chain boundaries', () => {
	const securitySkill = readText('.mustflow/skills/security-privacy-review/SKILL.md');
	const securityTemplate = readText(
		'templates/default/locales/en/.mustflow/skills/security-privacy-review/SKILL.md',
	);
	const regressionSkill = readText('.mustflow/skills/security-regression-tests/SKILL.md');
	const regressionTemplate = readText(
		'templates/default/locales/en/.mustflow/skills/security-regression-tests/SKILL.md',
	);
	const dependencySkill = readText('.mustflow/skills/dependency-reality-check/SKILL.md');
	const dependencyTemplate = readText(
		'templates/default/locales/en/.mustflow/skills/dependency-reality-check/SKILL.md',
	);
	const promptSkill = readText('.mustflow/skills/external-prompt-injection-defense/SKILL.md');
	const promptTemplate = readText(
		'templates/default/locales/en/.mustflow/skills/external-prompt-injection-defense/SKILL.md',
	);

	assert.equal(securitySkill, securityTemplate);
	assert.equal(regressionSkill, regressionTemplate);
	assert.equal(dependencySkill, dependencyTemplate);
	assert.equal(promptSkill, promptTemplate);
	assert.match(securitySkill, /AI-generated code as untrusted/u);
	assert.match(securitySkill, /server-side authorization/u);
	assert.match(securitySkill, /private network ranges/u);
	assert.match(securitySkill, /database-as-a-service/u);
	assert.match(securitySkill, /Do not stop at "is logged in"/u);
	assert.match(securitySkill, /JWT verification instead of decode-only logic/u);
	assert.match(securitySkill, /file upload and download/u);
	assert.match(securitySkill, /client-supplied prices/u);
	assert.match(securitySkill, /deployment settings/u);
	assert.match(securitySkill, /custom cryptography/u);
	assert.match(securitySkill, /secure randomness/u);
	assert.match(securitySkill, /certificate validation/u);
	assert.match(securitySkill, /architecture drift/u);
	assert.match(securitySkill, /policy engines, architecture linters, compliance validators/u);
	assert.match(securitySkill, /canonical policy source/u);
	assert.match(securitySkill, /repository-controlled advisory fields/u);
	assert.match(securitySkill, /Required security-control declarations should validate meaningful values/u);
	assert.match(securitySkill, /repository-local hooks, fsmonitor helpers, credential helpers/u);
	assert.match(securitySkill, /scanner output as evidence/u);
	assert.match(securitySkill, /domain-aware encoder/u);
	assert.match(securitySkill, /single-occurrence string replacement/u);
	assert.match(securitySkill, /encodeURI` versus `encodeURIComponent/u);
	assert.match(securitySkill, /first-occurrence `\.replace`/u);
	assert.match(securitySkill, /dependency-reality-check/u);
	assert.match(regressionSkill, /BOLA\/IDOR-style/u);
	assert.match(regressionSkill, /SSRF-style private network/u);
	assert.match(regressionSkill, /CSRF-style state change/u);
	assert.match(regressionSkill, /two actors and two resources/u);
	assert.match(regressionSkill, /decode-only JWT checks/u);
	assert.match(regressionSkill, /client-supplied price/u);
	assert.match(regressionSkill, /ORM mass assignment/u);
	assert.match(regressionSkill, /insecure randomness/u);
	assert.match(regressionSkill, /disabled certificate validation/u);
	assert.match(regressionSkill, /security invariant/u);
	assert.match(regressionSkill, /policy-source mismatch/u);
	assert.match(regressionSkill, /untrusted metadata override/u);
	assert.match(regressionSkill, /invalid-but-present security control values/u);
	assert.match(regressionSkill, /single-occurrence string replacement/u);
	assert.match(regressionSkill, /repeated metacharacters/u);
	assert.match(regressionSkill, /canonical output or denied side effect/u);
	assert.match(regressionSkill, /no repository-local shim or Git helper is executed/u);
	assert.match(regressionSkill, /no Git tree or archive path writes outside/u);
	assert.match(dependencySkill, /hallucination and lookalike risk/u);
	assert.match(dependencySkill, /slopsquatting risk/u);
	assert.match(dependencySkill, /lifecycle hooks/u);
	assert.match(dependencySkill, /install scripts/u);
	assert.match(dependencySkill, /broad suppressions/u);
	assert.match(promptSkill, /hidden or ambiguous content/u);
	assert.match(promptSkill, /MCP or tool configuration/u);
	assert.match(promptSkill, /network exfiltration path/u);
	assert.match(promptSkill, /auto-accept/u);
	assert.match(promptSkill, /context exposure/u);
	assert.match(promptSkill, /production credentials/u);
});

test('architecture deepening review stays review-first and template-synced', () => {
	const localSkill = readText('.mustflow/skills/architecture-deepening-review/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/architecture-deepening-review/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /review-first skill/u);
	assert.match(localSkill, /one to three candidate boundaries/u);
	assert.match(localSkill, /Score each candidate from 1 to 9/u);
	assert.match(localSkill, /It is not a license to create architecture because a pattern exists/u);
	assert.match(localSkill, /If implementation proceeds, use the narrower matching skill/u);
	assert.match(skillIndex, /Architecture, module boundaries, codebase structure/u);
	assert.match(skillIndex, /candidate scores, selected next action, narrower skill choice/u);
});

test('release notes authoring avoids invented history and stays template-synced', () => {
	const localSkill = readText('.mustflow/skills/release-notes-authoring/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/release-notes-authoring/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /user-provided change summaries/u);
	assert.match(localSkill, /current diff summaries/u);
	assert.match(localSkill, /no configured read-only release-history intent exists/u);
	assert.match(localSkill, /do not infer release history from raw Git commands/u);
	assert.match(localSkill, /internal_only/u);
	assert.match(skillIndex, /Release notes, changelog entries, public change summaries/u);
	assert.match(skillIndex, /skipped release-history checks/u);
});

test('date number audit classifies release version impact from public contracts', () => {
	const localSkill = readText('.mustflow/skills/date-number-audit/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/date-number-audit/SKILL.md');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /major`, `minor`, `patch`, or `no_release`/u);
	assert.match(localSkill, /Classify changed public contracts first/u);
	assert.match(localSkill, /documented or exported CLI commands/u);
	assert.match(localSkill, /Do not treat undocumented private helpers/u);
	assert.match(localSkill, /Tag a change as `MAJOR`/u);
	assert.match(localSkill, /Tag a change as `MINOR`/u);
	assert.match(localSkill, /Tag a change as `PATCH`/u);
	assert.match(localSkill, /Tag a change as `NO_RELEASE`/u);
	assert.match(localSkill, /Treat enums as closed unless their documentation explicitly says/u);
	assert.match(localSkill, /use the highest tag/u);
});

test('source freshness check covers external research intake without authority drift', () => {
	const localSkill = readText('.mustflow/skills/source-freshness-check/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/source-freshness-check/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /external research material from becoming product authority/u);
	assert.match(localSkill, /split the input into evidence, recommendation, executable instruction, popularity signal, and speculation/u);
	assert.match(localSkill, /mapped to existing mustflow command intents or reported as missing intent coverage/u);
	assert.match(localSkill, /repository-owned surface/u);
	assert.match(localSkill, /activate `external-prompt-injection-defense`/u);
	assert.match(skillIndex, /research notes, methodology recommendations, tool comparisons/u);
	assert.match(skillIndex, /copied external authority/u);
});

test('external skill intake defers web testing and handoff runtime boundaries', () => {
	const localSkill = readText('.mustflow/skills/external-skill-intake/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/external-skill-intake/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /Playwright-style web testing/u);
	assert.match(localSkill, /configured one-shot intent that starts, tests, and stops/u);
	assert.match(localSkill, /Do not tell agents to start a development server, watcher, browser session, or local server directly/u);
	assert.match(localSkill, /restricted ledger shape: goal, scope, touched files, verification plan/u);
	assert.match(localSkill, /Do not create a free-form handoff skill that stores hidden reasoning/u);
	assert.match(localSkill, /Deferred prerequisites such as bounded web-smoke intent or restricted handoff ledger/u);
	assert.match(skillIndex, /External `SKILL\.md` files, skill packs, awesome lists/u);
	assert.match(skillIndex, /default-profile bloat/u);
});

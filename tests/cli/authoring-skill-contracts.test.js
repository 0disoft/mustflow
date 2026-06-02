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
	assert.match(localSkill, /state architecture/u);
	assert.match(localSkill, /dependency and API reality/u);
	assert.match(localSkill, /high-risk widgets/u);
	assert.match(localSkill, /view tree, data contract, interaction model, state model/u);
	assert.match(localSkill, /component boundaries/u);
	assert.match(localSkill, /text overlap/u);
	assert.match(localSkill, /localization-safe labels/u);
	assert.match(localSkill, /performance and asset-size/u);
	assert.match(localSkill, /configured one-shot command or approved browser workflow/u);
	assert.match(localSkill, /Do not start development servers, watchers, or browser sessions directly/u);
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

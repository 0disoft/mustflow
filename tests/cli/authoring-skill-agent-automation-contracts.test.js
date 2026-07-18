import assert from 'node:assert/strict';
import test from 'node:test';

import {
	assertI18nSkillDocument,
	assertRouteReasonsText,
	assertSkillsIndexRevision,
	readSkillDirectoryNames,
	readText,
	routeReasons,
} from './helpers/skill-contracts.js';

test('agent execution control review keeps agent loops bounded and outcome-tested', () => {
	const localSkill = readText('.mustflow/skills/agent-execution-control-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/agent-execution-control-review/SKILL.md',
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
	assert.match(localSkill, /controlled workbenches/u);
	assert.match(localSkill, /fixed workflow/u);
	assert.match(localSkill, /Autonomy ledger/u);
	assert.match(localSkill, /Stage gate ledger/u);
	assert.match(localSkill, /planner, executor, verifier/u);
	assert.match(localSkill, /Tool contract ledger/u);
	assert.match(localSkill, /draft versus execute/u);
	assert.match(localSkill, /idempotency key/u);
	assert.match(localSkill, /irreversible effects after approval checkpoints/u);
	assert.match(localSkill, /state schema version/u);
	assert.match(localSkill, /profile, thread state, and evidence cache/u);
	assert.match(localSkill, /handoff/u);
	assert.match(localSkill, /guardrails/u);
	assert.match(localSkill, /loop budgets/u);
	assert.match(localSkill, /Retry by failure class/u);
	assert.match(localSkill, /Trace and eval outcome ledger/u);
	assert.match(localSkill, /privacy-safe/u);
	assert.match(localSkill, /prompt-contract-quality-review/u);
	assert.match(localSkill, /llm-token-cost-control-review/u);
	assert.match(localSkill, /llm-response-latency-review/u);
	assert.match(localSkill, /llm-hallucination-control-review/u);
	assert.match(localSkill, /llm-service-ux-review/u);
	assert.match(localSkill, /multi-agent-work-coordination/u);
	assert.match(localSkill, /agent-eval-integrity-review/u);
	assert.match(skillIndex, /\.mustflow\/skills\/agent-execution-control-review\/SKILL\.md/u);
	assert.match(skillIndex, /unnecessary autonomous agent/u);
	assert.match(skillIndex, /remaining agent execution-control risk/u);
	assert.match(routes, /\[routes\."agent-execution-control-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"\r?\npriority = 70/u);
	assert.match(routes, /"performance_change"/u);
	assert.match(manifest, /"\.mustflow\/skills\/agent-execution-control-review\/SKILL\.md"/u);
	assert.match(manifest, /"agent-execution-control-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.agent-execution-control-review"\][\s\S]*?revision = 2/u);
});

test('browser automation reliability review rejects click scripts without state evidence', () => {
	const localSkill = readText('.mustflow/skills/browser-automation-reliability-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/browser-automation-reliability-review/SKILL.md',
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
	assert.match(localSkill, /stateful, evidence-producing system/u);
	assert.match(localSkill, /Automation intent ledger/u);
	assert.match(localSkill, /Readiness ledger/u);
	assert.match(localSkill, /Selector and action ledger/u);
	assert.match(localSkill, /Auth and identity ledger/u);
	assert.match(localSkill, /External pressure ledger/u);
	assert.match(localSkill, /Agent and approval ledger/u);
	assert.match(localSkill, /Replace sleeps with readiness evidence/u);
	assert.match(localSkill, /Treat `networkidle` and selector-visible waits as weak signals/u);
	assert.match(localSkill, /Review locator contracts/u);
	assert.match(localSkill, /Avoid stale element handles/u);
	assert.match(localSkill, /Treat CAPTCHA and anti-bot as product states/u);
	assert.match(localSkill, /Classify retryable failures/u);
	assert.match(localSkill, /Make writes idempotent or confirm-before-replay/u);
	assert.match(localSkill, /Separate visual proof from business proof/u);
	assert.match(localSkill, /distrust page content/u);
	assert.match(localSkill, /Treat human approval as durable state/u);
	assert.match(skillIndex, /\.mustflow\/skills\/browser-automation-reliability-review\/SKILL\.md/u);
	assert.match(skillIndex, /sleep-as-readiness/u);
	assert.match(skillIndex, /screenshot-as-business-proof/u);
	assert.match(skillIndex, /remaining browser automation reliability risk/u);
	assert.match(routes, /\[routes\."browser-automation-reliability-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"\r?\npriority = 73/u);
	assert.deepEqual(routeReasons(routes, 'browser-automation-reliability-review'), [
		'unknown_change',
		'code_change',
		'behavior_change',
		'test_change',
		'docs_change',
		'public_api_change',
		'data_change',
		'performance_change',
		'security_change',
		'privacy_change',
		'ui_change',
		'product_change',
		'package_metadata_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/browser-automation-reliability-review\/SKILL\.md"/u);
	for (const profile of ['minimal', 'patterns', 'oss', 'team', 'product', 'library']) {
		const profileMatch = new RegExp(`^${profile} = \\[([\\s\\S]*?)^\\]`, 'mu').exec(manifest);
		assert.ok(profileMatch, `missing ${profile} profile`);
		assert.match(profileMatch[1], /"browser-automation-reliability-review"/u);
	}
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.browser-automation-reliability-review"\][\s\S]*?revision = 1/u);
});

test('multi-agent work coordination maps shared state before parallel workers edit', () => {
	const localSkill = readText('.mustflow/skills/multi-agent-work-coordination/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/multi-agent-work-coordination/SKILL.md',
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
	assert.match(localSkill, /revision: 3/u);
	assert.match(localSkill, /Define the Delegation Envelope/u);
	assert.match(localSkill, /worker count, roles, task boundaries, wait condition, merge rule, and output schema/u);
	assert.match(localSkill, /delegation depth: at most 1/u);
	assert.match(localSkill, /source agent, child session or thread ID/u);
	assert.match(localSkill, /Map Real Overlap Before Parallelizing/u);
	assert.match(localSkill, /directory distance alone/u);
	assert.match(localSkill, /public API, schema, event, route/u);
	assert.match(localSkill, /generated artifacts, lockfiles, caches, snapshots/u);
	assert.match(localSkill, /external state such as databases, ports, queues/u);
	assert.match(localSkill, /shared invariants such as authorization, idempotency, retry/u);
	assert.match(localSkill, /dependency graph and shared build or test outputs/u);
	assert.match(localSkill, /runs tests, builds, installs dependencies, regenerates code/u);
	assert.match(localSkill, /single-owner or integration-stage by default/u);
	assert.match(localSkill, /central registration files/u);
	assert.match(localSkill, /dependency manifests and shared lockfiles/u);
	assert.match(localSkill, /root or workspace configuration/u);
	assert.match(localSkill, /migrations, seed files, shared fixtures, snapshots/u);
	assert.match(localSkill, /repository-wide formatters, import organizers, codemods/u);
	assert.match(localSkill, /freeze the request, response, error, nullability, pagination/u);
	assert.match(localSkill, /Worktrees isolate source checkouts, not ports, databases/u);
	assert.match(localSkill, /Feature workers may create local descriptors or pending-registration notes/u);
	assert.match(localSkill, /merge worker branches one at a time/u);
	assert.match(skillIndex, /\.mustflow\/skills\/multi-agent-work-coordination\/SKILL\.md/u);
	assert.match(skillIndex, /same-file races, conflicting instructions, leaked credentials/u);
	assert.match(routes, /\[routes\."multi-agent-work-coordination"\]\r?\ncategory = "workflow_contracts"\r?\nroute_type = "adjunct"\r?\npriority = 90/u);
	assert.match(manifest, /"\.mustflow\/skills\/multi-agent-work-coordination\/SKILL\.md"/u);
	assert.match(manifest, /"multi-agent-work-coordination"/u);
	assert.match(i18n, /\[documents\."skill\.multi-agent-work-coordination"\][\s\S]*?revision = 3/u);
});

test('agent eval integrity review grades outcomes, trajectories, and oracle layers', () => {
	const localSkill = readText('.mustflow/skills/agent-eval-integrity-review/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/agent-eval-integrity-review/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /evidence loop, not a judge-model opinion/u);
	assert.match(localSkill, /final environment state/u);
	assert.match(localSkill, /trace or trajectory/u);
	assert.match(localSkill, /Outcome ledger/u);
	assert.match(localSkill, /Trace ledger/u);
	assert.match(localSkill, /Oracle ledger/u);
	assert.match(localSkill, /Tool-boundary ledger/u);
	assert.match(localSkill, /golden regression set, dirty real-world set/u);
	assert.match(localSkill, /pass@k/u);
	assert.match(localSkill, /pass\^k/u);
	assert.match(localSkill, /shadow environment/u);
	assert.match(localSkill, /production-monitoring/u);
	assert.match(localSkill, /deterministic checks/u);
	assert.match(localSkill, /model judges/u);
	assert.match(localSkill, /sample humans/u);
	assert.match(localSkill, /self-reflection/u);
	assert.match(localSkill, /prechecks and postchecks/u);
	assert.match(localSkill, /prepare, verify, and commit/u);
	assert.match(localSkill, /evidence packets/u);
	assert.match(localSkill, /Fuzz tool schemas/u);
	assert.match(localSkill, /tool names and namespaces/u);
	assert.match(localSkill, /payload size/u);
	assert.match(localSkill, /fail closed/u);
	assert.match(localSkill, /fail soft/u);
	assert.match(localSkill, /Avoid brittle path assertions/u);
	assert.match(localSkill, /Promote production failures into eval candidates/u);
	assert.match(localSkill, /privacy-safe/u);
	assert.match(localSkill, /agent-execution-control-review/u);
	assert.match(localSkill, /prompt-contract-quality-review/u);
	assert.match(skillIndex, /\.mustflow\/skills\/agent-eval-integrity-review\/SKILL\.md/u);
	assert.match(skillIndex, /LLM judge as sole oracle/u);
	assert.match(skillIndex, /remaining agent eval-integrity risk/u);
	assert.match(routes, /\[routes\."agent-eval-integrity-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"\r?\npriority = 71/u);
	assert.match(routes, /"performance_change"/u);
	assert.match(manifest, /"\.mustflow\/skills\/agent-eval-integrity-review\/SKILL\.md"/u);
	assert.match(manifest, /"agent-eval-integrity-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.agent-eval-integrity-review"\][\s\S]*?revision = 1/u);
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
	const filesystemReference = readText(
		'.mustflow/skills/cross-platform-filesystem-safety/references/path-containment-handle-checklist.md',
	);
	const filesystemReferenceTemplate = readText(
		'templates/default/locales/en/.mustflow/skills/cross-platform-filesystem-safety/references/path-containment-handle-checklist.md',
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
	assert.equal(filesystemReference, filesystemReferenceTemplate);
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
	assert.match(filesystemSkill, /opened object capability and its verified identity/u);
	assert.match(filesystemSkill, /decode that component exactly once/u);
	assert.match(filesystemSkill, /RESOLVE_BENEATH/u);
	assert.match(filesystemSkill, /O_NOFOLLOW.*only the final component/u);
	assert.match(filesystemSkill, /same HANDLE/u);
	assert.match(filesystemSkill, /hard links separately from symlinks/u);
	assert.match(filesystemSkill, /queue delay turns a path string into stale authority/u);
	assert.match(filesystemSkill, /prior opened-handle check alone/u);
	assert.match(filesystemSkill, /Go `os\.Root` or `os\.OpenInRoot`/u);
	assert.match(filesystemSkill, /Java `SecureDirectoryStream`/u);
	assert.match(filesystemSkill, /complete entry set before the first write/u);
	assert.match(filesystemSkill, /file-versus-directory prefix conflicts/u);
	assert.match(filesystemSkill, /sparse logical-size exhaustion/u);
	assert.match(filesystemReference, /raw bytes -> protocol parse/u);
	assert.match(filesystemReference, /Windows does not have a drop-in `openat2` equivalent/u);
	assert.match(filesystemReference, /A pathname is a mutable locator, not durable authority/u);
	assert.match(filesystemReference, /single permitted counterexample falsifies/u);
	assert.match(filesystemReference, /Runtime root-capability APIs/u);
	assert.match(filesystemReference, /Unix mount and bind-mount traversal is not blocked/u);
	assert.match(filesystemReference, /filesystem provider/u);
	assert.match(filesystemReference, /archive-supplied uid/u);
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
	assert.match(filePathSkill, /GitHub Action `output`, `report-output`/u);
	assert.match(filePathSkill, /Windows drive-relative paths such as `C:tmp`/u);
	assert.match(filePathSkill, /Validate parent traversal by path segment/u);
	assert.match(lineEndingSkill, /Docker or shell scripts fail with CRLF interpreter errors/u);
	assert.match(lineEndingSkill, /Do not create `\.gitattributes`/u);
	assert.match(lineEndingSkill, /repository-wide renormalization/u);
	assert.match(lineEndingSkill, /bad interpreter/u);
	assert.match(lineEndingSkill, /distinguish current working-tree drift from Git conversion warnings/u);
	assert.match(lineEndingSkill, /Per-file EOL evidence/u);
	assert.match(lineEndingSkill, /i\/lf w\/lf attr\/text=auto eol=lf/u);
	assert.match(lineEndingSkill, /future-conversion warning/u);
	assert.match(lineEndingSkill, /Reading a file does not prove it changed line endings/u);
	assert.match(lineEndingSkill, /without per-file EOL evidence/u);
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
	assert.match(dependencySkill, /workspace package contract/u);
	assert.match(dependencySkill, /package\.json` as that package's external contract/u);
	assert.match(dependencySkill, /emitted JavaScript imports a package/u);
	assert.match(dependencySkill, /public `\.d\.ts` type references an external package/u);
	assert.match(dependencySkill, /peerDependencies` contract plus local `devDependencies`/u);
	assert.match(dependencySkill, /workspace:\*`, `workspace:\^`/u);
	assert.match(dependencySkill, /Root overrides and resolutions are emergency graph controls/u);
	assert.match(dependencySkill, /tsconfig\.paths` as a TypeScript resolver hint/u);
	assert.match(dependencySkill, /A compiling import is not proof/u);
	assert.match(dependencySkill, /affected tests, build cache keys/u);
	assert.match(dependencySkill, /deploy\/prune artifacts/u);
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
	assert.match(securitySkill, /ReDoS or inefficient-regular-expression findings/u);
	assert.match(securitySkill, /bounded parser, token scanner, structured parser/u);
	assert.match(securitySkill, /lockfile CVEs/u);
	assert.match(securitySkill, /vulnerable package version no longer appears in the resolved graph/u);
	assert.match(securitySkill, /prototype-pollution sinks/u);
	assert.match(securitySkill, /value parameter binding does not protect identifier positions/u);
	assert.match(securitySkill, /sparse arrays, giant indexes, deep objects/u);
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
	assert.match(localSkill, /Reject layer theater before proposing deeper structure/u);
	assert.match(localSkill, /change-pressure evidence/u);
	assert.match(localSkill, /dependency direction is enforced/u);
	assert.match(localSkill, /Score each candidate from 1 to 9/u);
	assert.match(localSkill, /It is not a license to create architecture because a pattern exists/u);
	assert.match(localSkill, /If implementation proceeds, use the narrower matching skill/u);
	assert.match(skillIndex, /Architecture, module boundaries, codebase structure/u);
	assert.match(skillIndex, /candidate scores, selected next action, narrower skill choice/u);
});

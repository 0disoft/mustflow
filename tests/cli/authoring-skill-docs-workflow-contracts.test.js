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

test('docs prose review skill treats AI smell as concrete prose quality instead of authorship proof', () => {
	const localSkill = readText('.mustflow/skills/docs-prose-review/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/docs-prose-review/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.match(localSkill, /AI-slop signals/u);
	assert.match(localSkill, /low-specificity boilerplate/u);
	assert.match(localSkill, /Korean technical translationese/u);
	assert.match(localSkill, /authorship proof/u);
	assert.match(localSkill, /quality problems, not authorship evidence/u);
	assert.match(localSkill, /vague claim, translationese, passive-agent gap/u);
	assert.match(localSkill, /Do not fabricate evidence, numbers, production experience/u);
	assert.match(localSkill, /important role", "efficiently handles", "seamless integration"/u);
	assert.match(localSkill, /"user-friendly", "stable and scalable", "can contribute to"/u);
	assert.match(localSkill, /`~를 통해`, `~에 있어서`, `~에 의해`, `가능하게 합니다`, and `다음과 같습니다`/u);
	assert.match(localSkill, /`이 글에서는 \.\.\. 알아보겠습니다`/u);
	assert.match(localSkill, /`flaky`, `spoof`, `thin wrapper`, `heatmap`/u);
	assert.match(localSkill, /Do not introduce artificial typos/u);
	assert.match(localSkill, /If removing AI-slop signals would require inventing facts/u);
	assert.match(localSkill, /authorship-attribution/u);
	assert.match(skillIndex, /AI-slop signals, low-specificity boilerplate/u);
	assert.match(skillIndex, /fake authorship attribution, invented evidence/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.docs-prose-review"\][\s\S]*?revision = 3/u);
});

test('README evidence gate blocks unsupported README claims before prose polish', () => {
	const localSkill = readText('.mustflow/skills/readme-evidence-gate/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/readme-evidence-gate/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');
	const profileBlock = (profile) => {
		const match = new RegExp(`^${profile} = \\[([\\s\\S]*?)^\\]`, 'mu').exec(manifest);
		assert.ok(match, `missing ${profile} profile`);
		return match[1];
	};

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /evidence ledger before drafting/u);
	assert.match(localSkill, /folder names as suspicion only/u);
	assert.match(localSkill, /Gate commands by declared or maintained sources/u);
	assert.match(localSkill, /README-as-investment-deck overclaim/u);
	assert.match(localSkill, /`production-ready`, `enterprise-grade`, `scalable`, `one-line integration`/u);
	assert.match(localSkill, /`planned`, `in progress`, `experimental`, or `shipped`/u);
	assert.match(localSkill, /copied competitor README concepts/u);
	assert.match(localSkill, /hidden internal demo prerequisites/u);
	assert.match(localSkill, /model access, proxy settings, sample databases, migrations, workers, Redis, Postgres, queues/u);
	assert.match(localSkill, /Define support as tested support/u);
	assert.match(localSkill, /tested with PostgreSQL 15 and 16/u);
	assert.match(localSkill, /badges and numbers as scoped signals/u);
	assert.match(localSkill, /auth failure, timeout, empty data, permission denied, rate limit, pagination, and idempotency/u);
	assert.match(localSkill, /Keep experimental features visually and procedurally separate/u);
	assert.match(localSkill, /Block subjective maintenance-debt wording before prose polish/u);
	assert.match(localSkill, /`TODO later`, `temporary`, `for now`, `probably`/u);
	assert.match(localSkill, /`ask Slack`, `ask a person`, `production differs`, `sample may differ`, and `see code`/u);
	assert.match(localSkill, /current support, unsupported status, replacement commands, diagnostic steps/u);
	assert.match(localSkill, /Gate package-manager and install guidance by declared sources/u);
	assert.match(localSkill, /`packageManager`, `package-lock\.json`, `pnpm-lock\.yaml`, `yarn\.lock`, and `bun\.lock`/u);
	assert.match(localSkill, /Prefer reproducible install wording/u);
	assert.match(localSkill, /lockfile-backed Node README instructions/u);
	assert.match(localSkill, /`npm ci` over a mutating `npm install`/u);
	assert.match(localSkill, /`python -m pip check`/u);
	assert.match(localSkill, /Statically map README commands to real entry points/u);
	assert.match(localSkill, /`npm run dev` must exist in package metadata/u);
	assert.match(localSkill, /`python manage.py runserver`/u);
	assert.match(localSkill, /a Compose service must exist in Compose config/u);
	assert.match(localSkill, /`docker run \.`/u);
	assert.match(localSkill, /Separate install, setup, run, server-readiness, test, and build claims/u);
	assert.match(localSkill, /health endpoint, expected port, expected page response/u);
	assert.match(localSkill, /Label README code blocks by execution status/u);
	assert.match(localSkill, /`bash verify` separate from expected console output/u);
	assert.match(localSkill, /`bash no-run`/u);
	assert.match(localSkill, /Check OS and shell boundaries for pasteable instructions/u);
	assert.match(localSkill, /Windows, macOS, Linux, Bash, cmd, or PowerShell support/u);
	assert.match(localSkill, /README CLI names must match `bin` or documented entry points/u);
	assert.match(localSkill, /help text, output examples, stdout\/stderr shape, and exit semantics/u);
	assert.match(localSkill, /Gate environment variables by code or config/u);
	assert.match(localSkill, /public exports/u);
	assert.match(localSkill, /Match import paths against `exports`, `main`, `module`, `types`/u);
	assert.match(localSkill, /Treat README code blocks as pasteable contracts/u);
	assert.match(localSkill, /Gate README security exposure as if the README is public distribution/u);
	assert.match(localSkill, /real-looking fake keys such as `sk_live_\.\.\.`, `AKIA\.\.\.`, or `ghp_\.\.\.`/u);
	assert.match(localSkill, /Ban API keys in URL query strings/u);
	assert.match(localSkill, /pasteable production commands/u);
	assert.match(localSkill, /internal URLs, private IPs, admin URLs, staging or production domains/u);
	assert.match(localSkill, /production filesystem paths/u);
	assert.match(localSkill, /Check screenshots and images as README content/u);
	assert.match(localSkill, /revocation, rotation, history scanning, and log review/u);
	assert.match(localSkill, /`examples\/`, `tests\/readme\/`, fixtures, generated output snapshots, or CI-exercised README examples/u);
	assert.match(localSkill, /Gate test, build, and runtime support claims against real surfaces/u);
	assert.match(localSkill, /supported versions must match `engines`, CI matrices, runtime APIs, and Dockerfiles/u);
	assert.match(localSkill, /Gate README legal claims as repository contracts, not slogans/u);
	assert.match(localSkill, /`open source`, `MIT`, `Apache`, `GPL`, `commercial use allowed`/u);
	assert.match(localSkill, /`official`, `certified`, `partner`/u);
	assert.match(localSkill, /Use exact SPDX identifiers/u);
	assert.match(localSkill, /`Apache-2\.0`, `MIT`, `GPL-3\.0-only`, `GPL-3\.0-or-later`/u);
	assert.match(localSkill, /Preserve license conditions instead of collapsing them into permission slogans/u);
	assert.match(localSkill, /NOTICE, or network-use obligations/u);
	assert.match(localSkill, /Keep code, docs, assets, and trademarks separate/u);
	assert.match(localSkill, /Creative Commons may fit docs, art, or media/u);
	assert.match(localSkill, /open-source code rights do not grant trademark or logo rights/u);
	assert.match(localSkill, /Treat AI-generated provenance claims as weak evidence/u);
	assert.match(localSkill, /prefer reproducibility evidence over prose approval/u);
	assert.match(localSkill, /Installation logs, server readiness logs, test logs, build logs/u);
	assert.match(localSkill, /Gate security, privacy, production-readiness/u);
	assert.match(localSkill, /performance, scalability, benchmark/u);
	assert.match(localSkill, /platform-support, compatibility, and license claims/u);
	assert.match(localSkill, /partial, internal, experimental, planned, in-progress, unsupported, and shipped items/u);
	assert.match(localSkill, /Gate architecture explanations by executable structure/u);
	assert.match(localSkill, /file-tree explanations short and entry-point oriented/u);
	assert.match(localSkill, /Run a reverse audit after the draft/u);
	assert.match(localSkill, /Unsupported commands, environment variables, API examples/u);
	assert.match(localSkill, /Subjective maintenance-debt phrases removed or converted/u);
	assert.match(localSkill, /README overclaim, roadmap, support, badge, fake-example, internal-demo, experimental, and failure-path checks performed/u);
	assert.match(localSkill, /README security exposure checks performed/u);
	assert.match(localSkill, /Pasteable README contract checks performed/u);
	assert.match(localSkill, /README executable-command, clean-environment, code-block-label, OS-shell, server-readiness/u);
	assert.match(localSkill, /README license, SPDX, NOTICE, trademark, contributor-rights, third-party credit/u);
	assert.match(skillIndex, /readme-evidence-gate\/SKILL\.md/u);
	assert.match(skillIndex, /hallucinated README contract/u);
	assert.match(skillIndex, /TODO\/temporary\/internal-state wording/u);
	assert.match(skillIndex, /executable install\/run\/test\/build contracts/u);
	assert.match(skillIndex, /README-as-investment-deck overclaim/u);
	assert.match(skillIndex, /unshipped roadmap-as-current wording/u);
	assert.match(skillIndex, /fake or internal-demo usage examples/u);
	assert.match(skillIndex, /support and badge evidence/u);
	assert.match(skillIndex, /SPDX identifiers, source headers, package metadata/u);
	assert.match(skillIndex, /code-block execution policy, clean-environment evidence/u);
	assert.match(skillIndex, /untested executable README contract, OS-shell mismatch, missing server readiness/u);
	assert.match(skillIndex, /unsupported security\/performance\/platform\/license\/trademark claim/u);
	assert.match(skillIndex, /real-looking fake key, API key in URL query, internal URL, private IP, production path/u);
	assert.match(skillIndex, /security exposure checks/u);
	assert.match(skillIndex, /executable-command and clean-environment checks/u);
	assert.match(skillIndex, /legal\/SPDX\/NOTICE\/trademark\/credit checks/u);
	assert.match(skillIndex, /pasteable contract checks/u);
	assert.match(routes, /\[routes\."readme-evidence-gate"\]\r?\ncategory = "docs_release"\r?\nroute_type = "adjunct"/u);
	assert.deepEqual(routeReasons(routes, 'readme-evidence-gate'), [
		'docs_change',
		'copy_change',
		'public_api_change',
		'package_metadata_change',
		'security_change',
		'performance_change',
		'release_risk',
		'unknown_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/readme-evidence-gate\/SKILL\.md"/u);
	for (const profile of ['oss', 'library']) {
		assert.ok(profileBlock(profile).includes('"readme-evidence-gate"'), `${profile} profile missing skill`);
	}
	for (const profile of ['minimal', 'patterns', 'team', 'product']) {
		assert.equal(
			profileBlock(profile).includes('"readme-evidence-gate"'),
			false,
			`${profile} profile should not include skill`,
		);
	}
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, 'readme-evidence-gate', 4);
});

test('writing elegance skill stores reusable phrase fragments outside the main procedure', () => {
	const localSkill = readText('.mustflow/skills/writing-elegance/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/writing-elegance/SKILL.md');
	const phraseBank = readText('.mustflow/skills/writing-elegance/references/phrase-bank.md');
	const templatePhraseBank = readText(
		'templates/default/locales/en/.mustflow/skills/writing-elegance/references/phrase-bank.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');
	const profileBlock = (profile) => {
		const match = new RegExp(`^${profile} = \\[([\\s\\S]*?)^\\]`, 'mu').exec(manifest);
		assert.ok(match, `missing ${profile} profile`);
		return match[1];
	};

	assert.equal(localSkill, templateSkill);
	assert.equal(phraseBank, templatePhraseBank);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /seven numbered candidate expressions/u);
	assert.match(localSkill, /Prefer reusable fragments over finished sentences/u);
	assert.match(localSkill, /split before a proper noun, unique event/u);
	assert.match(localSkill, /Store entries as compact rows/u);
	assert.match(localSkill, /Do not store private names, unique character names/u);
	assert.match(localSkill, /The task is a documentation review queue entry/u);
	assert.match(phraseBank, /with no trace of hope \/ where no trace of hope remained/u);
	assert.match(phraseBank, /a small ___ worth protecting/u);
	assert.match(phraseBank, /Use before a fragile noun/u);
	assert.match(skillIndex, /writing-elegance\/SKILL\.md/u);
	assert.match(skillIndex, /over-specific sentence capture/u);
	assert.match(skillIndex, /phrase-bank bloat/u);
	assert.match(routes, /\[routes\."writing-elegance"\]\r?\ncategory = "docs_release"\r?\nroute_type = "primary"/u);
	assert.deepEqual(routeReasons(routes, 'writing-elegance'), [
		'docs_change',
		'copy_change',
		'workflow_change',
		'release_risk',
		'unknown_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/writing-elegance\/SKILL\.md"/u);
	assert.match(manifest, /"\.mustflow\/skills\/writing-elegance\/references\/phrase-bank\.md"/u);
	for (const profile of ['oss', 'team', 'product', 'library']) {
		assert.ok(profileBlock(profile).includes('"writing-elegance"'), `${profile} profile missing skill`);
	}
	for (const profile of ['minimal', 'patterns']) {
		assert.equal(profileBlock(profile).includes('"writing-elegance"'), false, `${profile} profile should not include skill`);
	}
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.writing-elegance"\][\s\S]*?revision = 1/u);
	assert.match(i18n, /\[documents\."skill\.writing-elegance\.phrase-bank"\][\s\S]*?revision = 1/u);
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
	assert.match(apiSkill, /HTTP QUERY/u);
	assert.match(apiSkill, /Accept-Query/u);
	assert.match(apiSkill, /GET request bodies as portable API contracts/u);
	assert.match(apiSkill, /request-content cache-key rules/u);
	assert.match(performanceSkill, /false compression win/u);
	assert.match(performanceSkill, /buffered stream latency/u);
	assert.match(adapterSkill, /WebTransport streams, datagrams/u);
	assert.match(adapterSkill, /fallback transport names/u);
	assert.match(adapterSkill, /change-isolation contract/u);
	assert.match(adapterSkill, /Change-isolation ledger/u);
	assert.match(adapterSkill, /preserved consumer contract/u);
	assert.match(adapterSkill, /Keep adapter-only changes adapter-only/u);
	assert.match(adapterSkill, /preserved-consumer tests/u);
	assert.match(freshnessSkill, /HTTP standard or browser-support references/u);
	assert.match(freshnessSkill, /WebTransport, compression dictionary transport, zstd content coding/u);
	assert.match(authSkill, /credentialed EventSource\/SSE streams/u);
	assert.match(authSkill, /CDN\/proxy cache keys/u);

	assert.match(skillIndex, /\.mustflow\/skills\/http-delivery-streaming\/SKILL\.md/u);
	assert.match(skillIndex, /wrong content decoding, cache poisoning/u);
	assert.match(routes, /\[routes\."http-delivery-streaming"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"/u);
	assertRouteReasonsText(routes, [
		'code_change',
		'behavior_change',
		'public_api_change',
		'performance_change',
		'security_change',
		'privacy_change',
		'docs_change',
		'test_change',
		'package_metadata_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/http-delivery-streaming\/SKILL\.md"/u);
	assert.match(manifest, /"http-delivery-streaming"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.http-delivery-streaming"\][\s\S]*?revision = 1/u);
	assert.match(i18n, /\[documents\."skill\.api-contract-change"\][\s\S]*?revision = 3/u);
	assert.match(i18n, /\[documents\."skill\.adapter-boundary"\][\s\S]*?revision = 13/u);
	assert.match(i18n, /\[documents\."skill\.performance-budget-check"\][\s\S]*?revision = 20/u);
	assert.match(i18n, /\[documents\."skill\.version-freshness-check"\][\s\S]*?revision = 10/u);
	assert.match(i18n, /\[documents\."skill\.auth-permission-change"\][\s\S]*?revision = 4/u);
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
	assertRouteReasonsText(routes, [
		'code_change',
		'behavior_change',
		'public_api_change',
		'data_change',
		'migration_change',
		'performance_change',
		'security_change',
		'privacy_change',
		'docs_change',
		'test_change',
		'package_metadata_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/backend-reliability-change\/SKILL\.md"/u);
	assert.match(manifest, /"backend-reliability-change"/u);
	assertSkillsIndexRevision(i18n);
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
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(pythonSkill, templatePythonSkill);
	assert.equal(dependencySkill, templateDependencySkill);
	assert.equal(freshnessSkill, templateFreshnessSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);

	assert.match(pythonSkill, /standard-library feature usage/u);
	assert.match(pythonSkill, /architecture boundaries/u);
	assert.match(pythonSkill, /build backend, package manager, lockfile owner/u);
	assert.match(pythonSkill, /Framework, ORM, SDK, raw input, and environment data stay outside/u);
	assert.match(pythonSkill, /Type hints do not enforce runtime values/u);
	assert.match(pythonSkill, /`Any`, bare generics, untyped imports, `cast`, broad `type: ignore`/u);
	assert.match(pythonSkill, /editable installs may not reflect entry point, dependency, package metadata/u);
	assert.match(pythonSkill, /Python 3\.14\+ `map\(strict=True\)`/u);
	assert.match(pythonSkill, /`itertools\.batched\(\.\.\., strict=True\)`/u);
	assert.match(pythonSkill, /`functools\.cache`, `lru_cache`, `cached_property`, `partial`, and Python 3\.14\+ `Placeholder`/u);
	assert.match(pythonSkill, /avoid list membership inside large loops/u);
	assert.match(pythonSkill, /archive extraction, including `tarfile`/u);
	assert.match(pythonSkill, /Interpreter or library diagnostics such as import timing, `tracemalloc`, `faulthandler`/u);
	assert.match(pythonSkill, /choose `TaskGroup` over `gather\(\)`/u);
	assert.match(pythonSkill, /propagate absolute deadlines/u);
	assert.match(pythonSkill, /translate external exceptions into domain exceptions/u);
	assert.match(pythonSkill, /fallback a visible degraded path/u);
	assert.match(pythonSkill, /pytest fixtures small/u);
	assert.match(pythonSkill, /mock `autospec`, `spec_set`, and `AsyncMock` await assertions/u);
	assert.match(skillIndex, /async tasks, exception\/logging\/retry behavior, collection performance/u);
	assert.match(skillIndex, /framework or ORM leakage into domain code/u);
	assert.deepEqual(routeReasons(routes, 'python-code-change'), [
		'code_change',
		'behavior_change',
		'public_api_change',
		'test_change',
		'data_change',
		'migration_change',
		'performance_change',
		'security_change',
		'privacy_change',
		'package_metadata_change',
		'release_risk',
	]);

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

	assert.match(i18n, /\[documents\."skill\.python-code-change"\][\s\S]*?revision = 5/u);
	assert.match(i18n, /\[documents\."skill\.dependency-upgrade-review"\][\s\S]*?revision = 6/u);
	assert.match(i18n, /\[documents\."skill\.version-freshness-check"\][\s\S]*?revision = 10/u);
});

test('clarifying question gate keeps blocking questions evidence-based and bounded', () => {
	const localSkill = readText('.mustflow/skills/clarifying-question-gate/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/clarifying-question-gate/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /Repair an ambiguous request into an executable task contract/u);
	assert.match(localSkill, /The goal is not to make the user rewrite the prompt/u);
	assert.match(localSkill, /vague imperative requests/u);
	assert.match(localSkill, /fix the bug/u);
	assert.match(localSkill, /target, criteria, scope, affected surfaces,\s+verification, and stop-or-ask boundary/u);
	assert.match(localSkill, /repository_answerable/u);
	assert.match(localSkill, /safe_assumption/u);
	assert.match(localSkill, /blocking_question/u);
	assert.match(localSkill, /ready_with_assumptions/u);
	assert.match(localSkill, /needs_confirmation/u);
	assert.match(localSkill, /blocked_by_conflict/u);
	assert.match(localSkill, /insufficient_evidence/u);
	assert.match(localSkill, /normalized task contract/u);
	assert.match(localSkill, /normalized execution contract/u);
	assert.match(localSkill, /observed target or failure source/u);
	assert.match(localSkill, /public contracts, data, security, UX, dependency, or generated outputs/u);
	assert.match(localSkill, /Normalize terse implementation commands before editing/u);
	assert.match(localSkill, /distinguish implementation defects from test or environment defects/u);
	assert.match(localSkill, /Do not treat "minimal fix" as the default/u);
	assert.match(localSkill, /user_confirmed/u);
	assert.match(localSkill, /repository_derived/u);
	assert.match(localSkill, /unresolved/u);
	assert.match(localSkill, /ask at most three questions at once/u);
	assert.match(localSkill, /ask only one question when its answer may make later questions irrelevant/u);
	assert.match(localSkill, /structured user-input mechanism such as Codex\s+`request_user_input` or MCP elicitation/u);
	assert.match(localSkill, /Structured input tools are optional host capabilities/u);
	assert.match(localSkill, /Prefer structured user input for real blocking decisions when the host exposes it/u);
	assert.match(localSkill, /explicitly listed as available in the current runtime or tool call/u);
	assert.match(localSkill, /provide two or three mutually exclusive choices/u);
	assert.match(localSkill, /put the recommended choice first/u);
	assert.match(localSkill, /allow free-form input when the host mechanism supports it/u);
	assert.match(localSkill, /auto-resolution only for non-blocking choices with a narrow reversible default/u);
	assert.match(localSkill, /never\s+for destructive actions, publish or release decisions/u);
	assert.match(localSkill, /do not invent a fake UI, long questionnaire,\s+or multiple-choice card in prose/u);
	assert.match(localSkill, /Question delivery mode: structured host input, normal chat fallback, or not needed/u);
	assert.match(localSkill, /Do not ask the user to answer facts that the\s+codebase can answer/u);
	assert.match(localSkill, /"should I add tests\?"/u);
	assert.match(localSkill, /Use prompt rewriting only as an exception/u);
	assert.match(localSkill, /task-instruction-authoring/u);
	assert.match(localSkill, /instruction-conflict-scope-check/u);
	assert.match(localSkill, /structure-discovery-gate/u);
	assert.match(localSkill, /prompt-contract-quality-review/u);
	assert.match(skillIndex, /\.mustflow\/skills\/clarifying-question-gate\/SKILL\.md/u);
	assert.match(skillIndex, /needs request-contract repair/u);
	assert.match(skillIndex, /source-tag laundering/u);
	assert.match(routes, /\[routes\."clarifying-question-gate"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assertRouteReasonsText(routes, [
		'unknown_change',
		'code_change',
		'behavior_change',
		'public_api_change',
		'security_change',
		'privacy_change',
		'data_change',
		'migration_change',
		'package_metadata_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/clarifying-question-gate\/SKILL\.md"/u);
	assert.match(manifest, /"clarifying-question-gate"/u);
	assert.match(i18n, /\[documents\."skill\.clarifying-question-gate"\][\s\S]*?revision = 4/u);
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
	assertRouteReasonsText(routes, [
		'code_change',
		'unknown_change',
		'behavior_change',
		'public_api_change',
		'security_change',
		'data_change',
		'migration_change',
		'product_change',
	]);
});

test('repro-first debug skill keeps diagnosis loop boundaries explicit', () => {
	const localSkill = readText('.mustflow/skills/repro-first-debug/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/repro-first-debug/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /three to five plausible hypotheses/u);
	assert.match(localSkill, /Reject symptom-cover patches/u);
	assert.match(localSkill, /broken invariant and first divergence/u);
	assert.match(localSkill, /normal-versus-failing trace comparison/u);
	assert.match(localSkill, /Diagnostic evidence packet/u);
	assert.match(localSkill, /Runtime state snapshot evidence/u);
	assert.match(localSkill, /make the next failure leave evidence/u);
	assert.match(localSkill, /pre-failure ring buffers/u);
	assert.match(localSkill, /last-known-good and first-failed/u);
	assert.match(localSkill, /Search stable constants, error strings, DB column names/u);
	assert.match(localSkill, /Start from exits and writers/u);
	assert.match(localSkill, /DB triggers, queues, cron, imports, and admin panels as code/u);
	assert.match(localSkill, /fixed seeds, fake clocks, forced interleavings/u);
	assert.match(localSkill, /Minimize production data into a safe fixture/u);
	assert.match(localSkill, /define the "fixed" metric before claiming success/u);
	assert.match(localSkill, /unique marker/u);
	assert.match(localSkill, /Re-run the original reproduction path/u);
	assert.match(localSkill, /Temporary instrumentation and debug output are removed/u);
	assert.match(localSkill, /Symptom-cover patches are rejected/u);
	assert.match(skillIndex, /hypotheses, observations, fix, original reproduction rerun/u);
});

test('vertical slice TDD skill stays explicitly triggered and template-synced', () => {
	const localSkill = readText('.mustflow/skills/vertical-slice-tdd/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/vertical-slice-tdd/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /TDD is explicitly requested/u);
	assert.match(localSkill, /one vertical behavior slice/u);
	assert.match(localSkill, /choose the next test by risk and evidence value/u);
	assert.match(localSkill, /what bug could still pass this test/u);
	assert.match(localSkill, /generated code did not outrun the selected test/u);
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

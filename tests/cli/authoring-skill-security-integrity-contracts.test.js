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

test('admin control plane safety review treats backoffice tools as production control planes', () => {
	const localSkill = readText('.mustflow/skills/admin-control-plane-safety-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/admin-control-plane-safety-review/SKILL.md',
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
	assert.match(localSkill, /Review administrator and operator surfaces as production control planes/u);
	assert.match(localSkill, /Admin actor and session ledger/u);
	assert.match(localSkill, /Permission ledger/u);
	assert.match(localSkill, /Dangerous action ledger/u);
	assert.match(localSkill, /Audit and change-history ledger/u);
	assert.match(localSkill, /Impersonation ledger/u);
	assert.match(localSkill, /Search, filter, export, import, and bulk ledger/u);
	assert.match(localSkill, /Treat one `is_admin` flag as insufficient/u);
	assert.match(localSkill, /Separate audit log from object change history/u);
	assert.match(localSkill, /Harden impersonation/u);
	assert.match(localSkill, /Add friction to dangerous actions/u);
	assert.match(localSkill, /Treat bulk operations as jobs/u);
	assert.match(localSkill, /Govern exports/u);
	assert.match(localSkill, /Govern imports/u);
	assert.match(localSkill, /Review admin search and filters/u);
	assert.match(localSkill, /Protect production from environment confusion/u);
	assert.match(localSkill, /Use `auth-permission-change` first/u);
	assert.match(localSkill, /Use `api-access-control-review` for the API proof/u);
	assert.match(localSkill, /Remaining admin-control-plane risk/u);
	assert.match(skillIndex, /\.mustflow\/skills\/admin-control-plane-safety-review\/SKILL\.md/u);
	assert.match(skillIndex, /admin-control-plane safety triage/u);
	assert.match(skillIndex, /single `is_admin` shortcut/u);
	assert.match(skillIndex, /export-as-harmless-read/u);
	assert.match(routes, /\[routes\."admin-control-plane-safety-review"\]\r?\ncategory = "security_privacy"\r?\nroute_type = "adjunct"\r?\npriority = 79/u);
	assert.deepEqual(routeReasons(routes, 'admin-control-plane-safety-review'), [
		'unknown_change',
		'code_change',
		'behavior_change',
		'public_api_change',
		'security_change',
		'privacy_change',
		'data_change',
		'test_change',
		'docs_change',
		'package_metadata_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/admin-control-plane-safety-review\/SKILL\.md"/u);
	for (const profile of ['minimal', 'patterns', 'oss', 'team', 'product', 'library']) {
		const profileMatch = new RegExp(`^${profile} = \\[([\\s\\S]*?)^\\]`, 'mu').exec(manifest);
		assert.ok(profileMatch, `missing ${profile} profile`);
		assert.match(profileMatch[1], /"admin-control-plane-safety-review"/u);
	}
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.admin-control-plane-safety-review"\][\s\S]*?revision = 1/u);
});

test('credit ledger integrity review keeps balance changes atomic and reconcilable', () => {
	const localSkill = readText('.mustflow/skills/credit-ledger-integrity-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/credit-ledger-integrity-review/SKILL.md',
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
	assert.match(localSkill, /accounting ledger/u);
	assert.match(localSkill, /Balance surface ledger/u);
	assert.match(localSkill, /Ledger-entry ledger/u);
	assert.match(localSkill, /Source identity ledger/u);
	assert.match(localSkill, /Atomicity ledger/u);
	assert.match(localSkill, /Amount and unit ledger/u);
	assert.match(localSkill, /Ownership ledger/u);
	assert.match(localSkill, /Expiry and lot ledger/u);
	assert.match(localSkill, /Reservation ledger/u);
	assert.match(localSkill, /Queue and cache ledger/u);
	assert.match(localSkill, /Audit and reconciliation ledger/u);
	assert.match(localSkill, /Treat balance as a derived fact/u);
	assert.match(localSkill, /Require an external source key/u);
	assert.match(localSkill, /Compare idempotency payloads/u);
	assert.match(localSkill, /Make insufficient-balance checks atomic/u);
	assert.match(localSkill, /Verify affected rows/u);
	assert.match(localSkill, /Follow the transaction boundary/u);
	assert.match(localSkill, /Lock the contested resource/u);
	assert.match(localSkill, /Classify optimistic-lock retries/u);
	assert.match(localSkill, /Use exact amount units/u);
	assert.match(localSkill, /Centralize rounding policy/u);
	assert.match(localSkill, /Validate amount shape at every entrypoint/u);
	assert.match(localSkill, /Add database-level invariants/u);
	assert.match(localSkill, /Enforce unique ledger identity/u);
	assert.match(localSkill, /Model refunds as reversals/u);
	assert.match(localSkill, /Test partial use and partial refund/u);
	assert.match(localSkill, /Consume expiry lots deliberately/u);
	assert.match(localSkill, /Race expiry and usage/u);
	assert.match(localSkill, /Separate reservation from capture/u);
	assert.match(localSkill, /Draw allowed state transitions/u);
	assert.match(localSkill, /Preserve queue ordering or tolerate reordering/u);
	assert.match(localSkill, /Treat message redelivery as normal/u);
	assert.match(localSkill, /Do not decide deduction from cache/u);
	assert.match(localSkill, /Handle read-replica lag/u);
	assert.match(localSkill, /Route admin adjustments through the same ledger/u);
	assert.match(localSkill, /Bind actor to wallet ownership/u);
	assert.match(localSkill, /Snapshot price and policy inputs/u);
	assert.match(localSkill, /Inject failure at split points/u);
	assert.match(localSkill, /Reconcile ledger and balance independently/u);
	assert.match(localSkill, /Log evidence, not vibes/u);
	assert.match(localSkill, /Test the nightmare paths/u);
	assert.match(skillIndex, /\.mustflow\/skills\/credit-ledger-integrity-review\/SKILL\.md/u);
	assert.match(skillIndex, /credit-ledger-integrity triage/u);
	assert.match(skillIndex, /happy-path-only credit tests/u);
	assert.match(routes, /\[routes\."credit-ledger-integrity-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 81/u);
	assertRouteReasonsText(routes, [
		'unknown_change',
		'code_change',
		'behavior_change',
		'test_change',
		'public_api_change',
		'performance_change',
		'security_change',
		'privacy_change',
		'data_change',
		'migration_change',
		'docs_change',
		'package_metadata_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/credit-ledger-integrity-review\/SKILL\.md"/u);
	assert.match(manifest, /"credit-ledger-integrity-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.credit-ledger-integrity-review"\][\s\S]*?revision = 1/u);
});

test('error message integrity review keeps failures actionable and safe', () => {
	const localSkill = readText('.mustflow/skills/error-message-integrity-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/error-message-integrity-review/SKILL.md',
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
	assert.match(localSkill, /recovery and evidence contracts/u);
	assert.match(localSkill, /Error audience ledger/u);
	assert.match(localSkill, /Error contract ledger/u);
	assert.match(localSkill, /Disclosure ledger/u);
	assert.match(localSkill, /Recovery ledger/u);
	assert.match(localSkill, /Reject empty failure labels/u);
	assert.match(localSkill, /Require `expected` and `actual`/u);
	assert.match(localSkill, /Put the failed action in the message/u);
	assert.match(localSkill, /Explain cause, not only result/u);
	assert.match(localSkill, /Add human-readable work context/u);
	assert.match(localSkill, /Split public and internal messages/u);
	assert.match(localSkill, /Redact sensitive values/u);
	assert.match(localSkill, /Keep safe identifiers/u);
	assert.match(localSkill, /Expose retryability deliberately/u);
	assert.match(localSkill, /Stop abusing "try again later"/u);
	assert.match(localSkill, /Separate stable error codes from messages/u);
	assert.match(localSkill, /Avoid overbroad error code buckets/u);
	assert.match(localSkill, /Choose validation aggregation intentionally/u);
	assert.match(localSkill, /Put location in parse errors/u);
	assert.match(localSkill, /Put bounds in range errors/u);
	assert.match(localSkill, /Include time basis in time errors/u);
	assert.match(localSkill, /Preserve provider diagnostics/u);
	assert.match(localSkill, /Preserve original causes/u);
	assert.match(localSkill, /Control template string composition/u);
	assert.match(localSkill, /Structure logs for machines/u);
	assert.match(localSkill, /Keep user messages free of internal jargon/u);
	assert.match(localSkill, /Make permission errors intentionally safe/u);
	assert.match(localSkill, /Ban vague impossible-state text/u);
	assert.match(localSkill, /Name concurrency conflict facts/u);
	assert.match(localSkill, /Include idempotency history/u);
	assert.match(localSkill, /Put attempts in job and queue errors/u);
	assert.match(localSkill, /Represent partial failure honestly/u);
	assert.match(localSkill, /Test error contracts/u);
	assert.match(localSkill, /Ask the 30-second action question/u);
	assert.match(skillIndex, /\.mustflow\/skills\/error-message-integrity-review\/SKILL\.md/u);
	assert.match(skillIndex, /error-message-integrity triage/u);
	assert.match(skillIndex, /call-site-specific taxonomy drift/u);
	assert.match(routes, /\[routes\."error-message-integrity-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 68/u);
	assertRouteReasonsText(routes, [
		'unknown_change',
		'code_change',
		'behavior_change',
		'test_change',
		'public_api_change',
		'security_change',
		'privacy_change',
		'docs_change',
		'package_metadata_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/error-message-integrity-review\/SKILL\.md"/u);
	assert.match(manifest, /"error-message-integrity-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.error-message-integrity-review"\][\s\S]*?revision = 1/u);
});

test('api misuse resistance review keeps caller contracts hard to misuse', () => {
	const localSkill = readText('.mustflow/skills/api-misuse-resistance-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/api-misuse-resistance-review/SKILL.md',
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
	assert.match(localSkill, /caller's side/u);
	assert.match(localSkill, /caller ergonomics/u);
	assert.match(localSkill, /hidden state machines/u);
	assert.match(localSkill, /Caller ledger/u);
	assert.match(localSkill, /Operation ledger/u);
	assert.match(localSkill, /Shape ledger/u);
	assert.match(localSkill, /Read the call site aloud/u);
	assert.match(localSkill, /Separate purpose from mechanism in names/u);
	assert.match(localSkill, /Expose hidden state machines/u);
	assert.match(localSkill, /Hunt boolean parameters/u);
	assert.match(localSkill, /Audit option objects as mode bags/u);
	assert.match(localSkill, /Give absence one meaning per boundary/u);
	assert.match(localSkill, /Stop leaking storage rows as response DTOs/u);
	assert.match(localSkill, /Treat error shape as part of usability/u);
	assert.match(localSkill, /Model failure as carefully as success/u);
	assert.match(localSkill, /Require idempotency for networked creation with side effects/u);
	assert.match(localSkill, /Make pagination stable under moving data/u);
	assert.match(localSkill, /Define sorting and filtering as contracts/u);
	assert.match(localSkill, /Show authorization shape in the API/u);
	assert.match(localSkill, /Review state changes as commands/u);
	assert.match(localSkill, /Keep PATCH from becoming a command bus/u);
	assert.match(localSkill, /Specify time values fully/u);
	assert.match(localSkill, /Keep money out of floating-point shapes/u);
	assert.match(localSkill, /Treat external enums as open/u);
	assert.match(localSkill, /Draw the sync or async boundary/u);
	assert.match(localSkill, /Represent partial failure honestly/u);
	assert.match(localSkill, /Ask whether the response can be cached/u);
	assert.match(localSkill, /Balance response size and call count by caller task/u);
	assert.match(localSkill, /Separate internal and external APIs/u);
	assert.match(localSkill, /Treat version labels as policy, not decoration/u);
	assert.match(localSkill, /Make deprecation measurable/u);
	assert.match(localSkill, /Define rate limits and retry hints/u);
	assert.match(localSkill, /Make the API observable/u);
	assert.match(localSkill, /Test through the caller contract/u);
	assert.match(localSkill, /Check SDK ergonomics/u);
	assert.match(localSkill, /Finish with the first-time caller question/u);
	assert.match(skillIndex, /\.mustflow\/skills\/api-misuse-resistance-review\/SKILL\.md/u);
	assert.match(skillIndex, /api-misuse-resistance triage/u);
	assert.match(skillIndex, /first-time caller trap/u);
	assert.match(routes, /\[routes\."api-misuse-resistance-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 69/u);
	assertRouteReasonsText(routes, [
		'unknown_change',
		'code_change',
		'behavior_change',
		'test_change',
		'public_api_change',
		'performance_change',
		'security_change',
		'privacy_change',
		'data_change',
		'docs_change',
		'package_metadata_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/api-misuse-resistance-review\/SKILL\.md"/u);
	assert.match(manifest, /"api-misuse-resistance-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.api-misuse-resistance-review"\][\s\S]*?revision = 1/u);
});

test('api access control review keeps API authorization object scoped', () => {
	const localSkill = readText('.mustflow/skills/api-access-control-review/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/api-access-control-review/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /API security as an access-control proof/u);
	assert.match(localSkill, /Subject-object-action-context ledger/u);
	assert.match(localSkill, /Object authorization ledger/u);
	assert.match(localSkill, /Property authorization ledger/u);
	assert.match(localSkill, /Function authorization ledger/u);
	assert.match(localSkill, /Authentication proof ledger/u);
	assert.match(localSkill, /Ask the full permission question/u);
	assert.match(localSkill, /Treat request-supplied identity as hostile/u);
	assert.match(localSkill, /Bind authorization to the data lookup/u);
	assert.match(localSkill, /Separate authentication from authorization/u);
	assert.match(localSkill, /Replace role-only checks/u);
	assert.match(localSkill, /Compare list and detail scopes/u);
	assert.match(localSkill, /Review write APIs harder than read APIs/u);
	assert.match(localSkill, /Stop mass assignment at the boundary/u);
	assert.match(localSkill, /Check response DTOs for property-level exposure/u);
	assert.match(localSkill, /Treat client-side admin UI as decoration/u);
	assert.match(localSkill, /Search for temporary public holes/u);
	assert.match(localSkill, /Review router and middleware order/u);
	assert.match(localSkill, /Review GraphQL per resolver/u);
	assert.match(localSkill, /Review batch APIs per item/u);
	assert.match(localSkill, /Review export, download, preview, thumbnail, and share paths/u);
	assert.match(localSkill, /Treat signed storage URLs as outputs of authorization/u);
	assert.match(localSkill, /Enforce tenant boundaries in every query and cache/u);
	assert.match(localSkill, /Revalidate asynchronous jobs/u);
	assert.match(localSkill, /Separate webhook authenticity from authorization/u);
	assert.match(localSkill, /Keep OAuth and OIDC purposes distinct/u);
	assert.match(localSkill, /Verify JWTs completely/u);
	assert.match(localSkill, /Treat token claims as snapshots/u);
	assert.match(localSkill, /Regenerate session identity after privilege changes/u);
	assert.match(localSkill, /Check authentication cookies/u);
	assert.match(localSkill, /Require reauthentication for sensitive actions/u);
	assert.match(localSkill, /Review reset and magic-link tokens/u);
	assert.match(localSkill, /Compare account-enumeration responses/u);
	assert.match(localSkill, /Treat automation defense as part of authentication/u);
	assert.match(localSkill, /Separate internal and external identity planes/u);
	assert.match(localSkill, /Test the denial matrix/u);
	assert.match(localSkill, /payment or refund API authorization/u);
	assert.match(localSkill, /Use `payment-integrity-review` for money-event correctness/u);
	assert.match(skillIndex, /\.mustflow\/skills\/api-access-control-review\/SKILL\.md/u);
	assert.match(skillIndex, /api-access-control triage/u);
	assert.match(skillIndex, /happy-path-only auth tests/u);
	assert.match(routes, /\[routes\."api-access-control-review"\]\r?\ncategory = "security_privacy"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 77/u);
	assertRouteReasonsText(routes, [
		'unknown_change',
		'code_change',
		'behavior_change',
		'public_api_change',
		'security_change',
		'privacy_change',
		'data_change',
		'test_change',
		'docs_change',
		'package_metadata_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/api-access-control-review\/SKILL\.md"/u);
	assert.match(manifest, /"api-access-control-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.api-access-control-review"\][\s\S]*?revision = 3/u);
});

test('file upload security review follows uploaded files through storage and serving', () => {
	const localSkill = readText('.mustflow/skills/file-upload-security-review/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/file-upload-security-review/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /full lifecycle/u);
	assert.match(localSkill, /Upload entrypoint ledger/u);
	assert.match(localSkill, /File identity ledger/u);
	assert.match(localSkill, /Validation ledger/u);
	assert.match(localSkill, /Processing ledger/u);
	assert.match(localSkill, /Serving ledger/u);
	assert.match(localSkill, /Draw the file lifecycle/u);
	assert.match(localSkill, /Treat frontend restrictions as usability only/u);
	assert.match(localSkill, /Decode and normalize before extension checks/u);
	assert.match(localSkill, /Prefer allowlists over blocklists/u);
	assert.match(localSkill, /Validate the final storage name and key/u);
	assert.match(localSkill, /Prove path containment/u);
	assert.match(localSkill, /Prevent overwrite and key guessing/u);
	assert.match(localSkill, /Keep uploaded bytes outside executable web roots/u);
	assert.match(localSkill, /Do not trust request MIME labels/u);
	assert.match(localSkill, /Treat magic bytes as necessary but not sufficient/u);
	assert.match(localSkill, /Re-encode images when possible/u);
	assert.match(localSkill, /Treat SVG and HTML as active content/u);
	assert.match(localSkill, /Treat PDF and Office documents as active document bundles/u);
	assert.match(localSkill, /Review archive extraction as the main feature/u);
	assert.match(localSkill, /Review CSV import and export for formula injection/u);
	assert.match(localSkill, /Review remote URL import as SSRF plus upload/u);
	assert.match(localSkill, /Keep scanner and conversion work behind a publication gate/u);
	assert.match(localSkill, /Sandbox file parsers and scanners/u);
	assert.match(localSkill, /Validate direct-to-storage uploads in two phases/u);
	assert.match(localSkill, /Treat presigned URLs as delegated authority/u);
	assert.match(localSkill, /Enforce tenant boundaries in storage keys and metadata/u);
	assert.match(localSkill, /Recheck authorization at download and preview time/u);
	assert.match(localSkill, /Set response headers deliberately/u);
	assert.match(localSkill, /Treat filename display as an injection surface/u);
	assert.match(localSkill, /Apply resource limits at every layer/u);
	assert.match(localSkill, /Revalidate chunked and multipart uploads at assembly time/u);
	assert.match(localSkill, /Review upload endpoint auth, CSRF, and rate limits/u);
	assert.match(localSkill, /Check storage cleanup without breaking authorization/u);
	assert.match(localSkill, /Test denial cases from the attacker's path/u);
	assert.match(skillIndex, /\.mustflow\/skills\/file-upload-security-review\/SKILL\.md/u);
	assert.match(skillIndex, /file-upload-security triage/u);
	assert.match(skillIndex, /happy-path-only upload tests/u);
	assert.match(routes, /\[routes\."file-upload-security-review"\]\r?\ncategory = "security_privacy"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 78/u);
	assertRouteReasonsText(routes, [
		'unknown_change',
		'code_change',
		'behavior_change',
		'public_api_change',
		'security_change',
		'privacy_change',
		'data_change',
		'test_change',
		'docs_change',
		'package_metadata_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/file-upload-security-review\/SKILL\.md"/u);
	assert.match(manifest, /"file-upload-security-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.file-upload-security-review"\][\s\S]*?revision = 1/u);
});

test('security flow review traces source-to-sink security boundaries', () => {
	const localSkill = readText('.mustflow/skills/security-flow-review/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/security-flow-review/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /source-to-sink/u);
	assert.match(localSkill, /real sink/u);
	assert.match(localSkill, /authentication from authorization/u);
	assert.match(localSkill, /IDOR or BOLA/u);
	assert.match(localSkill, /UUID is a long address, not a lock/u);
	assert.match(localSkill, /findMany/u);
	assert.match(localSkill, /exportCsv/u);
	assert.match(localSkill, /state-changing operations/u);
	assert.match(localSkill, /mass assignment/u);
	assert.match(localSkill, /admin-only/u);
	assert.match(localSkill, /cache keys/u);
	assert.ok(localSkill.includes('`ORDER BY ${sort}`'));
	assert.match(localSkill, /shell wrappers/u);
	assert.match(localSkill, /SSRF candidate/u);
	assert.match(localSkill, /Zip Slip/u);
	assert.match(localSkill, /decompression bombs/u);
	assert.match(localSkill, /path traversal/u);
	assert.match(localSkill, /XSS/u);
	assert.match(localSkill, /CSRF/u);
	assert.match(localSkill, /OAuth needs `state`/u);
	assert.match(localSkill, /JWT validation/u);
	assert.match(localSkill, /Cookies need `HttpOnly`/u);
	assert.match(localSkill, /homegrown cryptography/u);
	assert.match(localSkill, /fail-open/u);
	assert.match(localSkill, /queued work/u);
	assert.match(localSkill, /race conditions/u);
	assert.ok(localSkill.includes('supply-chain and CI/CD'));
	assert.match(skillIndex, /\.mustflow\/skills\/security-flow-review\/SKILL\.md/u);
	assert.match(skillIndex, /security-flow triage/u);
	assert.match(skillIndex, /IDOR or BOLA risk/u);
	assert.match(skillIndex, /postinstall or CI secret exposure/u);
	assert.match(routes, /\[routes\."security-flow-review"\]\r?\ncategory = "security_privacy"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 76/u);
	assertRouteReasonsText(routes, [
		'code_change',
		'behavior_change',
		'public_api_change',
		'security_change',
		'privacy_change',
		'data_change',
		'test_change',
		'docs_change',
		'package_metadata_change',
		'release_risk',
		'unknown_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/security-flow-review\/SKILL\.md"/u);
	assert.match(manifest, /"security-flow-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.security-flow-review"\][\s\S]*?revision = 1/u);
});

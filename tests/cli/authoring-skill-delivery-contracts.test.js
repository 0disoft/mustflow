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

test('idempotency integrity review catches duplicate-intent side effects', () => {
	const localSkill = readText('.mustflow/skills/idempotency-integrity-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/idempotency-integrity-review/SKILL.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');
	const localReference = readText(
		'.mustflow/skills/idempotency-integrity-review/references/operation-ordering-stale-write-checklist.md',
	);
	const templateReference = readText(
		'templates/default/locales/en/.mustflow/skills/idempotency-integrity-review/references/operation-ordering-stale-write-checklist.md',
	);

	assert.equal(localSkill, templateSkill);
	assert.equal(localReference, templateReference);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /^revision: 3$/mu);
	assert.match(localSkill, /operation identity plus state-validity integrity/u);
	assert.match(localSkill, /Operation identity ledger/u);
	assert.match(localSkill, /Side-effect ledger/u);
	assert.match(localSkill, /Durable dedupe evidence/u);
	assert.match(localSkill, /Duplicate response policy/u);
	assert.match(localSkill, /Concurrency and recovery evidence/u);
	assert.match(localSkill, /Idempotency-Key/u);
	assert.match(localSkill, /request body hash/u);
	assert.match(localSkill, /actor, tenant, operation type, target resource/u);
	assert.match(localSkill, /memory-only stores/u);
	assert.match(localSkill, /Redis TTL alone/u);
	assert.match(localSkill, /unique constraint/u);
	assert.match(localSkill, /exists return` followed by `insert/u);
	assert.match(localSkill, /response replay/u);
	assert.match(localSkill, /duplicate in-progress request/u);
	assert.match(localSkill, /Treat timeouts as unknown outcomes/u);
	assert.match(localSkill, /provider idempotency/u);
	assert.match(localSkill, /WHERE id = \? AND status = PENDING/u);
	assert.match(localSkill, /\+=/u);
	assert.match(localSkill, /DELETE/u);
	assert.match(localSkill, /GET endpoints/u);
	assert.match(localSkill, /at-least-once/u);
	assert.match(localSkill, /Ack before durable commit/u);
	assert.match(localSkill, /webhook handlers as replay surfaces/u);
	assert.match(localSkill, /settlement_date \+ merchant_id/u);
	assert.match(localSkill, /outbox and inbox/u);
	assert.match(localSkill, /Compensation actions/u);
	assert.match(localSkill, /PROCESSING/u);
	assert.match(localSkill, /lease, heartbeat, timeout, owner/u);
	assert.match(localSkill, /Distributed locks/u);
	assert.match(localSkill, /same request twice/u);
	assert.match(localSkill, /duplicate key with changed payload/u);
	assert.match(localSkill, /ordering scope and authority token/u);
	assert.match(localSkill, /ahead-with-a-gap/u);
	assert.match(localSkill, /failed compare-and-swap as a stale decision/u);
	assert.match(localSkill, /Process-local single-flight reduces duplicate load/u);
	assert.match(localSkill, /Operation Identity, Ordering, and Stale-Write Checklist/u);
	assert.match(localReference, /One failure model/u);
	assert.match(localReference, /Atomic duplicate admission/u);
	assert.match(localReference, /Causal tokens and gaps/u);
	assert.match(localReference, /Stale completion rejection/u);
	assert.match(localReference, /Adversarial tests/u);
	assert.match(localReference, /Reconciliation invariants/u);
	assert.match(skillIndex, /\.mustflow\/skills\/idempotency-integrity-review\/SKILL\.md/u);
	assert.match(skillIndex, /idempotency-integrity triage/u);
	assert.match(skillIndex, /duplicate business commands/u);
	assert.match(routes, /\[routes\."idempotency-integrity-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 80/u);
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
	assert.match(manifest, /"\.mustflow\/skills\/idempotency-integrity-review\/SKILL\.md"/u);
	assert.match(
		manifest,
		/"\.mustflow\/skills\/idempotency-integrity-review\/references\/operation-ordering-stale-write-checklist\.md"/u,
	);
	assert.match(manifest, /"idempotency-integrity-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.idempotency-integrity-review"\][\s\S]*?revision = 3/u);
});

test('queue processing integrity review catches message settlement traps', () => {
	const localSkill = readText('.mustflow/skills/queue-processing-integrity-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/queue-processing-integrity-review/SKILL.md',
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
	assert.match(localSkill, /success boundary/u);
	assert.match(localSkill, /Broker and delivery model/u);
	assert.match(localSkill, /Success boundary/u);
	assert.match(localSkill, /Producer boundary/u);
	assert.match(localSkill, /Consumer state ledger/u);
	assert.match(localSkill, /Failure and retry policy/u);
	assert.match(localSkill, /Concurrency and ordering evidence/u);
	assert.match(localSkill, /Observability evidence/u);
	assert.match(localSkill, /`deleteMessage`/u);
	assert.match(localSkill, /`commitSync`/u);
	assert.match(localSkill, /`commitAsync`/u);
	assert.match(localSkill, /`acks_late`/u);
	assert.match(localSkill, /`autoAck`/u);
	assert.match(localSkill, /`maxReceiveCount`/u);
	assert.match(localSkill, /`MessageGroupId`/u);
	assert.match(localSkill, /Ack, delete, commit, or mark-complete before durable work/u);
	assert.match(localSkill, /`finally` block that always acknowledges/u);
	assert.match(localSkill, /unbounded redelivery loops/u);
	assert.match(localSkill, /producer confirmation/u);
	assert.match(localSkill, /DB commit and queue publish/u);
	assert.match(localSkill, /async handler ownership/u);
	assert.match(localSkill, /Batch commit after mixed success/u);
	assert.match(localSkill, /committed offset or checkpoint means the next message/u);
	assert.match(localSkill, /SQS-style visibility/u);
	assert.match(localSkill, /stale receipt handles/u);
	assert.match(localSkill, /in-flight limits/u);
	assert.match(localSkill, /RabbitMQ-style ack/u);
	assert.match(localSkill, /`multiple=true`/u);
	assert.match(localSkill, /Kafka-style offset/u);
	assert.match(localSkill, /rebalance revoke/u);
	assert.match(localSkill, /Celery-style task acknowledgement/u);
	assert.match(localSkill, /worker-loss behavior/u);
	assert.match(localSkill, /FIFO groups/u);
	assert.match(localSkill, /DLQ as a workflow/u);
	assert.match(localSkill, /Unlimited `Promise\.all`/u);
	assert.match(localSkill, /shutdown, cancellation, and worker loss/u);
	assert.match(localSkill, /decision: processed, acknowledged, committed, retried/u);
	assert.match(localSkill, /replay-path evidence/u);
	assert.match(skillIndex, /\.mustflow\/skills\/queue-processing-integrity-review\/SKILL\.md/u);
	assert.match(skillIndex, /queue-processing integrity triage/u);
	assert.match(skillIndex, /falsely claim processing success/u);
	assert.match(routes, /\[routes\."queue-processing-integrity-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 79/u);
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
	assert.match(manifest, /"\.mustflow\/skills\/queue-processing-integrity-review\/SKILL\.md"/u);
	assert.match(manifest, /"queue-processing-integrity-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.queue-processing-integrity-review"\][\s\S]*?revision = 2/u);
});

test('retry policy integrity review catches amplification and unsafe replay', () => {
	const localSkill = readText('.mustflow/skills/retry-policy-integrity-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/retry-policy-integrity-review/SKILL.md',
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
	assert.match(localSkill, /failure amplification control/u);
	assert.match(localSkill, /Retry surface/u);
	assert.match(localSkill, /Layered retry ledger/u);
	assert.match(localSkill, /Attempt budget/u);
	assert.match(localSkill, /Retry predicate/u);
	assert.match(localSkill, /Side-effect and idempotency ledger/u);
	assert.match(localSkill, /Backoff and jitter policy/u);
	assert.match(localSkill, /Overload and throttling evidence/u);
	assert.match(localSkill, /Observability and test evidence/u);
	assert.match(localSkill, /`while true`/u);
	assert.match(localSkill, /`for \(;;\)`/u);
	assert.match(localSkill, /recursive retry/u);
	assert.match(localSkill, /`maxAttempts`/u);
	assert.match(localSkill, /`maxElapsedTime`/u);
	assert.match(localSkill, /`Retry-After`/u);
	assert.match(localSkill, /Count the retry layers/u);
	assert.match(localSkill, /27 dependency calls/u);
	assert.match(localSkill, /SDK defaults/u);
	assert.match(localSkill, /max attempts and max elapsed time/u);
	assert.match(localSkill, /per-attempt timeout from total deadline/u);
	assert.match(localSkill, /DNS lookup, TCP connect, TLS handshake, connection pool wait/u);
	assert.match(localSkill, /Do not retry validation errors/u);
	assert.match(localSkill, /unknown outcomes as dangerous/u);
	assert.match(localSkill, /idempotency key reuse/u);
	assert.match(localSkill, /A new key per attempt defeats provider idempotency/u);
	assert.match(localSkill, /actor, tenant, operation type, target resource, and payload fingerprint/u);
	assert.match(localSkill, /transactions and locks/u);
	assert.match(localSkill, /pool and concurrency pressure/u);
	assert.match(localSkill, /Exponential backoff needs jitter/u);
	assert.match(localSkill, /parse both seconds and dates/u);
	assert.match(localSkill, /global and per-key throttling/u);
	assert.match(localSkill, /Reset per-key failure counters/u);
	assert.match(localSkill, /Timeout, retry, circuit breaker, bulkhead, token bucket/u);
	assert.match(localSkill, /cause, status code, retry-after, provider error code, request id/u);
	assert.match(localSkill, /committed responses and streaming bodies/u);
	assert.match(localSkill, /may not be replayable after the first attempt/u);
	assert.match(localSkill, /Application retry plus broker redelivery plus DLQ retry/u);
	assert.match(localSkill, /dependency-specific configuration/u);
	assert.match(localSkill, /attempts_total, retry_exhausted_total/u);
	assert.match(localSkill, /cancellation during sleep/u);
	assert.match(localSkill, /fake clocks, injected sleeper, injected retry policy/u);
	assert.match(skillIndex, /\.mustflow\/skills\/retry-policy-integrity-review\/SKILL\.md/u);
	assert.match(skillIndex, /retry-policy integrity triage/u);
	assert.match(skillIndex, /can amplify failures, duplicate side effects, hide permanent errors/u);
	assert.match(routes, /\[routes\."retry-policy-integrity-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 79/u);
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
	assert.match(manifest, /"\.mustflow\/skills\/retry-policy-integrity-review\/SKILL\.md"/u);
	assert.match(manifest, /"retry-policy-integrity-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.retry-policy-integrity-review"\][\s\S]*?revision = 1/u);
});

test('transaction boundary integrity review catches atomicity and side-effect traps', () => {
	const localSkill = readText('.mustflow/skills/transaction-boundary-integrity-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/transaction-boundary-integrity-review/SKILL.md',
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
	assert.match(localSkill, /read -> decision -> write/u);
	assert.match(localSkill, /Business invariant/u);
	assert.match(localSkill, /Decision ledger/u);
	assert.match(localSkill, /Durable guard evidence/u);
	assert.match(localSkill, /exists\(\)/u);
	assert.match(localSkill, /insert\(\)/u);
	assert.match(localSkill, /count < limit/u);
	assert.match(localSkill, /SELECT \.\.\. FOR UPDATE/u);
	assert.match(localSkill, /SKIP LOCKED/u);
	assert.match(localSkill, /READ COMMITTED/u);
	assert.match(localSkill, /REPEATABLE READ/u);
	assert.match(localSkill, /SERIALIZABLE/u);
	assert.match(localSkill, /serialization_failure/u);
	assert.match(localSkill, /deadlock_detected/u);
	assert.match(localSkill, /rollbackFor/u);
	assert.match(localSkill, /self-invocation/u);
	assert.match(localSkill, /readOnly/u);
	assert.match(localSkill, /rollback-only/u);
	assert.match(localSkill, /UnexpectedRollbackException/u);
	assert.match(localSkill, /REQUIRES_NEW/u);
	assert.match(localSkill, /NESTED/u);
	assert.match(localSkill, /Django/u);
	assert.match(localSkill, /atomic\(\)/u);
	assert.match(localSkill, /transaction\.on_commit\(\)/u);
	assert.match(localSkill, /afterCommit/u);
	assert.match(localSkill, /outbox/u);
	assert.match(localSkill, /idempotency key/u);
	assert.match(localSkill, /HTTP API/u);
	assert.match(localSkill, /flush is not commit/u);
	assert.match(localSkill, /SQLAlchemy/u);
	assert.match(localSkill, /optimistic lock/u);
	assert.match(localSkill, /@Version/u);
	assert.match(localSkill, /advisory locks/u);
	assert.match(localSkill, /transaction manager/u);
	assert.match(localSkill, /transactional tests/u);
	assert.match(localSkill, /commit-time constraints/u);
	assert.match(localSkill, /after-commit callback/u);
	assert.match(skillIndex, /\.mustflow\/skills\/transaction-boundary-integrity-review\/SKILL\.md/u);
	assert.match(skillIndex, /transaction-boundary integrity triage/u);
	assert.match(skillIndex, /read-decision-write integrity/u);
	assert.match(routes, /\[routes\."transaction-boundary-integrity-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 79/u);
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
	]);
	assert.match(manifest, /"\.mustflow\/skills\/transaction-boundary-integrity-review\/SKILL\.md"/u);
	assert.match(manifest, /"transaction-boundary-integrity-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.transaction-boundary-integrity-review"\][\s\S]*?revision = 2/u);
});

test('testability boundary review exposes hidden decisions and test friction', () => {
	const localSkill = readText('.mustflow/skills/testability-boundary-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/testability-boundary-review/SKILL.md',
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
	assert.match(localSkill, /stop time/u);
	assert.match(localSkill, /force failure/u);
	assert.match(localSkill, /replace the external world/u);
	assert.match(localSkill, /fix random output/u);
	assert.match(localSkill, /without peeking through private seams/u);
	assert.match(localSkill, /Decision-input ledger/u);
	assert.match(localSkill, /Side-effect ledger/u);
	assert.match(localSkill, /Observability ledger/u);
	assert.match(localSkill, /Test friction evidence/u);
	assert.match(localSkill, /`new Date\(\)`/u);
	assert.match(localSkill, /`Date\.now\(\)`/u);
	assert.match(localSkill, /`LocalDateTime\.now\(\)`/u);
	assert.match(localSkill, /`System\.currentTimeMillis\(\)`/u);
	assert.match(localSkill, /`Math\.random\(\)`/u);
	assert.match(localSkill, /Constructors should accept ingredients, not start cooking\./u);
	assert.match(localSkill, /static, singleton, and global state/u);
	assert.match(localSkill, /large private methods/u);
	assert.match(localSkill, /boolean mode flags/u);
	assert.match(localSkill, /`RequestOptions`/u);
	assert.match(localSkill, /Void functions/u);
	assert.ok(localSkill.includes('`catch { log.warn(...) }`'));
	assert.match(localSkill, /cache outside the policy/u);
	assert.match(localSkill, /ORM behavior/u);
	assert.match(localSkill, /transaction and external-call coupling/u);
	assert.match(localSkill, /Hidden event publication/u);
	assert.match(localSkill, /fire-and-forget/u);
	assert.match(localSkill, /`setTimeout`/u);
	assert.match(localSkill, /retry, backoff, timeout, and expiration/u);
	assert.match(localSkill, /Stabilize collection ordering/u);
	assert.match(localSkill, /Make defaults explicit/u);
	assert.match(localSkill, /input shape validation/u);
	assert.match(localSkill, /Centralize authorization evidence/u);
	assert.match(localSkill, /framework magic/u);
	assert.match(localSkill, /controllers as translators/u);
	assert.match(localSkill, /conditional DTO mapping/u);
	assert.match(localSkill, /five or more mocks/u);
	assert.match(localSkill, /outcome assertions/u);
	assert.match(localSkill, /deep inheritance/u);
	assert.match(localSkill, /reflection-only tests/u);
	assert.match(localSkill, /`test-design-guard`/u);
	assert.match(skillIndex, /\.mustflow\/skills\/testability-boundary-review\/SKILL\.md/u);
	assert.match(skillIndex, /testability-boundary triage/u);
	assert.match(skillIndex, /hidden decision inputs/u);
	assert.match(skillIndex, /reflection-only tests/u);
	assert.match(routes, /\[routes\."testability-boundary-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 74/u);
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
	]);
	assert.match(manifest, /"\.mustflow\/skills\/testability-boundary-review\/SKILL\.md"/u);
	assert.match(manifest, /"testability-boundary-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.testability-boundary-review"\][\s\S]*?revision = 1/u);
});

test('durable execution skills keep distinct ownership and synchronized install contracts', () => {
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');
	const cases = [
		{
			name: 'dual-write-consistency',
			category: 'general_code',
			routeType: 'adjunct',
			priority: 82,
			phrases: [
				'independently committed',
				'outbox',
				'reconciliation',
				'exactly-once',
				'workflow-step, terminal-state, and compensation-state recovery',
			],
		},
		{
			name: 'two-phase-transition-integrity-review',
			category: 'general_code',
			routeType: 'adjunct',
			priority: 84,
			revision: 2,
			phrases: [
				'old committed owner authoritative',
				'atomic conditional commit',
				'active_transition_id',
				'fencing token',
				'cutoff sequence',
				'shadow execution',
				'network calls',
				'reverse transition',
				'admission as a durable promise',
				'observer knowledge',
				'admission backpressure',
			],
			reference: 'references/two-phase-transition-checklist.md',
			referencePhrases: [
				'Authority invariant',
				'Phase and command matrix',
				'Lease and fencing matrix',
				'Failure-injection matrix',
				'state together with the last processed sequence',
			],
			additionalReference: 'references/admission-decision-recovery-checklist.md',
			additionalReferencePhrases: [
				'Three state axes',
				'Unknown outcomes',
				'Recovery ownership and backpressure',
				'Identity and idempotency',
				'Operator decisions',
				'Safety and liveness',
			],
		},
		{
			name: 'session-handoff-integrity-review',
			category: 'general_code',
			routeType: 'adjunct',
			priority: 86,
			revision: 2,
			phrases: [
				'authority cutover with state and effect continuity',
				'Pair every snapshot with a source revision',
				'per-store cursor vector',
				'Make target readiness session-specific',
				'Enforce fencing at final sinks',
				'Treat timeout and lost response as observer `UNKNOWN`',
				'For AI-agent sessions, separate runtime context from model-visible context',
				'one-purpose, one-time handoff or resume ticket',
				'Track independent client-to-server and server-to-client',
				'Cut over only at complete application boundaries',
				'pending approval identity',
				'Test the history, not only the final row',
			],
			reference: 'references/session-handoff-protocol-checklist.md',
			referencePhrases: [
				'Protocol invariants',
				'Transfer-class inventory',
				'Live commands and quiescence',
				'Target acceptance',
				'AI-agent context envelope',
				'Tools, artifacts, output, and approvals',
				'Fault matrix',
				'History properties',
			],
			additionalReference: 'references/session-auth-stream-resume-checklist.md',
			additionalReferencePhrases: [
				'Consistent state boundary',
				'Hidden state, expiry, and deletion',
				'Cursor and acknowledgment semantics',
				'Handoff and resume credentials',
				'Authorization freshness and delegation',
				'Bidirectional replay and resume',
				'Make-before-break and drain',
				'Message, compression, and media boundaries',
				'Early-data replay',
			],
		},
		{
			name: 'durable-workflow-orchestration',
			category: 'general_code',
			routeType: 'primary',
			priority: 85,
			phrases: [
				'workflow instance',
				'process loss',
				'compensation',
				'state schema',
				'distinct operation type and idempotency namespace',
				'delivery, consumer-application, and projection convergence',
			],
		},
		{
			name: 'execution-ledger-integrity-review',
			category: 'general_code',
			routeType: 'adjunct',
			priority: 82,
			phrases: ['append-only execution ledger', 'effect receipt', 'monotonic sequence', 'replay'],
		},
		{
			name: 'policy-decision-integrity-review',
			category: 'security_privacy',
			routeType: 'adjunct',
			priority: 82,
			phrases: [
				'require-approval',
				'obligations',
				'policy version',
				'attenuation',
				'Human approval must not silently override a deny',
				'parent capability ID',
			],
		},
		{
			name: 'structured-concurrency-supervision-review',
			category: 'general_code',
			routeType: 'adjunct',
			priority: 81,
			phrases: ['bounded fan-out', 'sibling failure', 'late results', 'join'],
		},
	];

	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assertSkillsIndexRevision(i18n);

	for (const entry of cases) {
		const revision = entry.revision ?? 1;
		const localSkill = readText(`.mustflow/skills/${entry.name}/SKILL.md`);
		const templateSkill = readText(
			`templates/default/locales/en/.mustflow/skills/${entry.name}/SKILL.md`,
		);

		assert.equal(localSkill, templateSkill, `${entry.name} source and template must match`);
		assert.match(localSkill, new RegExp(`^revision: ${revision}$`, 'mu'));
		for (const phrase of entry.phrases) {
			assert.ok(localSkill.includes(phrase), `${entry.name} should preserve ${phrase}`);
		}
		assert.ok(skillIndex.includes(`.mustflow/skills/${entry.name}/SKILL.md`));
		assert.match(
			routes,
			new RegExp(
				`\\[routes\\."${entry.name}"\\]\\r?\\ncategory = "${entry.category}"\\r?\\nroute_type = "${entry.routeType}"\\r?\\npriority = ${entry.priority}`,
				'u',
			),
		);
		assert.ok(manifest.includes(`".mustflow/skills/${entry.name}/SKILL.md"`));
		if (entry.reference) {
			const localReference = readText(`.mustflow/skills/${entry.name}/${entry.reference}`);
			const templateReference = readText(
				`templates/default/locales/en/.mustflow/skills/${entry.name}/${entry.reference}`,
			);
			assert.equal(localReference, templateReference, `${entry.name} reference source and template must match`);
			for (const phrase of entry.referencePhrases) {
				assert.ok(localReference.includes(phrase), `${entry.name} reference should preserve ${phrase}`);
			}
			assert.ok(manifest.includes(`".mustflow/skills/${entry.name}/${entry.reference}"`));
		}
		if (entry.additionalReference) {
			const localReference = readText(`.mustflow/skills/${entry.name}/${entry.additionalReference}`);
			const templateReference = readText(
				`templates/default/locales/en/.mustflow/skills/${entry.name}/${entry.additionalReference}`,
			);
			assert.equal(
				localReference,
				templateReference,
				`${entry.name} additional reference source and template must match`,
			);
			for (const phrase of entry.additionalReferencePhrases) {
				assert.ok(
					localReference.includes(phrase),
					`${entry.name} additional reference should preserve ${phrase}`,
				);
			}
			assert.ok(manifest.includes(`".mustflow/skills/${entry.name}/${entry.additionalReference}"`));
		}
		assert.match(
			i18n,
			new RegExp(`\\[documents\\."skill\\.${entry.name}"\\][\\s\\S]*?revision = ${revision}`, 'u'),
		);
	}
});

test('existing skills hand off durable execution ownership instead of absorbing it', () => {
	const expectations = {
		'adapter-boundary': ['dual-write-consistency', 'policy-decision-integrity-review'],
		'command-pattern': [
			'durable-workflow-orchestration',
			'execution-ledger-integrity-review',
			'policy-decision-integrity-review',
			'credit-ledger-integrity-review',
			'llm-token-cost-control-review',
		],
		'state-machine-pattern': ['durable-workflow-orchestration'],
		'agent-execution-control-review': [
			'structured-concurrency-supervision-review',
			'durable-workflow-orchestration',
			'execution-ledger-integrity-review',
			'policy-decision-integrity-review',
			'Permit attenuation only',
			'server-known arguments',
			'Canonicalize defaulted and omitted tool arguments',
		],
		'idempotency-integrity-review': [
			'dual-write-consistency',
			'execution-ledger-integrity-review',
			'durable-workflow-orchestration',
		],
		'queue-processing-integrity-review': [
			'dual-write-consistency',
			'durable-workflow-orchestration',
			'structured-concurrency-supervision-review',
		],
		'transaction-boundary-integrity-review': [
			'dual-write-consistency',
			'durable-workflow-orchestration',
		],
		'concurrency-invariant-review': ['structured-concurrency-supervision-review'],
		'api-contract-change': ['durable-workflow-orchestration', 'migration-safety-check'],
		'public-json-contract-change': [
			'durable-workflow-orchestration',
			'execution-ledger-integrity-review',
			'migration-safety-check',
		],
		'migration-safety-check': [
			'Persisted workflow, checkpoint, run, attempt, or execution-ledger schema versions',
			'this skill owns only the old-to-new transformation',
		],
		'llm-token-cost-control-review': [
			'credit-ledger-integrity-review',
			'policy-decision-integrity-review',
			'command-pattern',
		],
		'credit-ledger-integrity-review': [
			'soft token, step, concurrency, request-count, or rate budgets',
			'Commands and durable workflows may consume those operations',
		],
	};

	for (const [skillName, phrases] of Object.entries(expectations)) {
		const skill = readText(`.mustflow/skills/${skillName}/SKILL.md`);
		for (const phrase of phrases) {
			assert.ok(skill.includes(phrase), `${skillName} should hand off ${phrase}`);
		}
	}
});

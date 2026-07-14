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

test('failure integrity review catches false-success error handling', () => {
	const localSkill = readText('.mustflow/skills/failure-integrity-review/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/failure-integrity-review/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /what lie the system tells/u);
	assert.match(localSkill, /`try`\/`catch`/u);
	assert.match(localSkill, /broad `catch \(Exception\)`/u);
	assert.match(localSkill, /log-and-continue/u);
	assert.match(localSkill, /`return null`/u);
	assert.match(localSkill, /`return false`/u);
	assert.match(localSkill, /`return \[\]`/u);
	assert.match(localSkill, /`finally`/u);
	assert.match(localSkill, /cleanup masking/u);
	assert.match(localSkill, /safe identifiers/u);
	assert.match(localSkill, /tokens, session cookies, payment details/u);
	assert.match(localSkill, /transaction/u);
	assert.match(localSkill, /compensation, reconciliation/u);
	assert.match(localSkill, /Unknown provider outcomes/u);
	assert.match(localSkill, /retry/u);
	assert.match(localSkill, /timeout/u);
	assert.match(localSkill, /idempotent/u);
	assert.match(localSkill, /cancellation/u);
	assert.match(localSkill, /`InterruptedException`/u);
	assert.match(localSkill, /`AbortError`/u);
	assert.match(localSkill, /async failure ownership/u);
	assert.match(localSkill, /fire-and-forget/u);
	assert.match(localSkill, /Ack after failure drops work/u);
	assert.match(localSkill, /dead-letter/u);
	assert.match(localSkill, /retain the cause/u);
	assert.match(localSkill, /stable machine-readable codes/u);
	assert.match(localSkill, /business rejections from system failures/u);
	assert.match(localSkill, /partial state/u);
	assert.match(localSkill, /lock\(\)/u);
	assert.match(localSkill, /resource cleanup/u);
	assert.match(localSkill, /dangerous default value/u);
	assert.match(localSkill, /fail-open/u);
	assert.match(localSkill, /Cache failure/u);
	assert.match(localSkill, /Fallback must be a safe degraded value/u);
	assert.match(localSkill, /failure-path evidence/u);
	assert.match(localSkill, /retry exhaustion/u);
	assert.match(localSkill, /fallback activation/u);
	assert.match(localSkill, /data inconsistency/u);
	assert.match(skillIndex, /\.mustflow\/skills\/failure-integrity-review\/SKILL\.md/u);
	assert.match(skillIndex, /failure-integrity triage for exception or failure handling/u);
	assert.match(skillIndex, /false success, swallowed exceptions/u);
	assert.match(skillIndex, /missing failure-path observability/u);
	assert.match(routes, /\[routes\."failure-integrity-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 78/u);
	assertRouteReasonsText(routes, [
		'unknown_change',
		'code_change',
		'behavior_change',
		'test_change',
		'public_api_change',
		'data_change',
		'security_change',
		'privacy_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/failure-integrity-review\/SKILL\.md"/u);
	assert.match(manifest, /"failure-integrity-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.failure-integrity-review"\][\s\S]*?revision = 1/u);
});

test('observability debuggability review catches incident evidence gaps', () => {
	const localSkill = readText('.mustflow/skills/observability-debuggability-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/observability-debuggability-review/SKILL.md',
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
	assert.match(localSkill, /incident narrowing evidence/u);
	assert.match(localSkill, /Incident question/u);
	assert.match(localSkill, /Signal inventory/u);
	assert.match(localSkill, /trace-first diagnosis/u);
	assert.match(localSkill, /normal and failing trace trees/u);
	assert.match(localSkill, /trace, log, and profiler evidence/u);
	assert.match(localSkill, /same window's process, pool, dependency, and queue evidence/u);
	assert.match(localSkill, /Metric model/u);
	assert.match(localSkill, /Trace and event model/u);
	assert.match(localSkill, /Log model/u);
	assert.match(localSkill, /Privacy and retention constraints/u);
	assert.match(localSkill, /numerator and denominator/u);
	assert.match(localSkill, /average-only latency/u);
	assert.match(localSkill, /Protect metric cardinality/u);
	assert.match(localSkill, /raw URL paths/u);
	assert.match(localSkill, /raw user id/u);
	assert.match(localSkill, /route templates/u);
	assert.match(localSkill, /trace id and span id/u);
	assert.match(localSkill, /async and queue context propagation/u);
	assert.match(localSkill, /Separate attempt from operation/u);
	assert.match(localSkill, /User cancellation, upstream deadline, server timeout/u);
	assert.match(localSkill, /stable dependency name and operation name/u);
	assert.match(localSkill, /Avoid raw SQL/u);
	assert.match(localSkill, /Transaction flows should expose begin, commit, rollback/u);
	assert.match(localSkill, /idempotency key, dedupe key, message id/u);
	assert.match(localSkill, /DB write succeeds but event publish fails/u);
	assert.match(localSkill, /queue delay or message age/u);
	assert.match(localSkill, /last success timestamp/u);
	assert.match(localSkill, /heartbeat or synthetic item/u);
	assert.match(localSkill, /pool saturation/u);
	assert.match(localSkill, /service version, git sha or release id/u);
	assert.match(localSkill, /feature flag or experiment variant/u);
	assert.match(localSkill, /alert and runbook usefulness/u);
	assert.match(localSkill, /telemetry self-observability/u);
	assert.match(localSkill, /Head sampling can drop rare errors/u);
	assert.match(localSkill, /fallback event logs for key span boundaries/u);
	assert.match(localSkill, /Baggage should be small, safe, low-lifetime/u);
	assert.match(skillIndex, /\.mustflow\/skills\/observability-debuggability-review\/SKILL\.md/u);
	assert.match(skillIndex, /observability-debuggability triage/u);
	assert.match(skillIndex, /high-cardinality metric explosions/u);
	assert.match(routes, /\[routes\."observability-debuggability-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 78/u);
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
	assert.match(manifest, /"\.mustflow\/skills\/observability-debuggability-review\/SKILL\.md"/u);
	assert.match(manifest, /"observability-debuggability-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.observability-debuggability-review"\][\s\S]*?revision = 3/u);
});

test('incident triage review narrows outages by evidence elimination', () => {
	const localSkill = readText('.mustflow/skills/incident-triage-review/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/incident-triage-review/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /evidence elimination/u);
	assert.match(localSkill, /first bad minute/u);
	assert.match(localSkill, /affected slice/u);
	assert.match(localSkill, /recent change/u);
	assert.match(localSkill, /wait or saturation class/u);
	assert.match(localSkill, /Pin the first bad time/u);
	assert.match(localSkill, /Split scope before reading deep logs/u);
	assert.match(localSkill, /Compare success and failure/u);
	assert.match(localSkill, /Prefer tail and timeout evidence over averages/u);
	assert.match(localSkill, /CPU-idle slowness ambiguity/u);
	assert.match(localSkill, /OOM-killer event/u);
	assert.match(localSkill, /inode pressure/u);
	assert.match(localSkill, /Proxy or load-balancer 502, 503, or 504/u);
	assert.match(localSkill, /499, 408, and client-closed-request/u);
	assert.match(localSkill, /pool-wait blindness/u);
	assert.match(localSkill, /Slow-query duration can include lock wait/u);
	assert.match(localSkill, /Cache hit rate is insufficient/u);
	assert.match(localSkill, /Do not treat ping as proof/u);
	assert.match(localSkill, /ephemeral-port exhaustion/u);
	assert.match(localSkill, /conntrack saturation/u);
	assert.match(localSkill, /Kubernetes node versus pod/u);
	assert.match(localSkill, /A deployment can cause an incident long after rollout/u);
	assert.match(localSkill, /cron or batch/u);
	assert.match(localSkill, /log volume as both symptom and cause/u);
	assert.match(localSkill, /elimination ledger/u);
	assert.match(localSkill, /manual-only diagnostic boundaries/u);
	assert.match(skillIndex, /\.mustflow\/skills\/incident-triage-review\/SKILL\.md/u);
	assert.match(skillIndex, /incident-triage review/u);
	assert.match(skillIndex, /time, scope,\s+change, wait, saturation, dependency/u);
	assert.match(routes, /\[routes\."incident-triage-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 77/u);
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
	assert.match(manifest, /"\.mustflow\/skills\/incident-triage-review\/SKILL\.md"/u);
	assert.match(manifest, /"incident-triage-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.incident-triage-review"\][\s\S]*?revision = 1/u);
});

test('deployment rollout safety review keeps deploys stoppable and observable', () => {
	const localSkill = readText('.mustflow/skills/deployment-rollout-safety-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/deployment-rollout-safety-review/SKILL.md',
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
	assert.match(localSkill, /runtime state transition/u);
	assert.match(localSkill, /not\s+just restarting an older container/u);
	assert.match(localSkill, /Deployment resource ledger/u);
	assert.match(localSkill, /Artifact identity/u);
	assert.match(localSkill, /Release envelope/u);
	assert.match(localSkill, /Deployment model/u);
	assert.match(localSkill, /Pipeline gate model/u);
	assert.match(localSkill, /Preview model/u);
	assert.match(localSkill, /Migration check model/u);
	assert.match(localSkill, /Secret and approval model/u);
	assert.match(localSkill, /Infrastructure and observability model/u);
	assert.match(localSkill, /Compatibility model/u);
	assert.match(localSkill, /required status checks/u);
	assert.match(localSkill, /fast-fail ordering/u);
	assert.match(localSkill, /flaky-test quarantine/u);
	assert.match(localSkill, /release_id/u);
	assert.match(localSkill, /mutable tag such as `latest`/u);
	assert.match(localSkill, /preview deployment a rehearsal/u);
	assert.match(localSkill, /production secrets/u);
	assert.match(localSkill, /ephemeral database/u);
	assert.match(localSkill, /artifact promotion/u);
	assert.match(localSkill, /built immutable artifact/u);
	assert.match(localSkill, /image digests as the rollback proof/u);
	assert.match(localSkill, /Preserve rollback history and warm capacity/u);
	assert.match(localSkill, /traffic rollback/u);
	assert.match(localSkill, /expand\/migrate\/read-write\/switch\/contract/u);
	assert.match(localSkill, /migration lock timeout/u);
	assert.match(localSkill, /shadow database evidence/u);
	assert.match(localSkill, /rollback preview evidence/u);
	assert.match(localSkill, /point-in-time recovery practice/u);
	assert.match(localSkill, /database config backup/u);
	assert.match(localSkill, /config and IaC changes as code changes/u);
	assert.match(localSkill, /versioned or immutable config names/u);
	assert.match(localSkill, /rendered manifests or plans/u);
	assert.match(localSkill, /image digest pinning/u);
	assert.match(localSkill, /environment-scoped secrets/u);
	assert.match(localSkill, /OIDC or\s+short-lived credentials/u);
	assert.match(localSkill, /startup, liveness, and readiness/u);
	assert.match(localSkill, /restart loop/u);
	assert.match(localSkill, /graceful shutdown/u);
	assert.match(localSkill, /connection draining/u);
	assert.match(localSkill, /Drain workers deliberately/u);
	assert.match(localSkill, /consumer pause/u);
	assert.match(localSkill, /N-1 message compatibility/u);
	assert.match(localSkill, /Unknown event types/u);
	assert.match(localSkill, /quarantine/u);
	assert.match(localSkill, /external side effects/u);
	assert.match(localSkill, /compensation/u);
	assert.match(localSkill, /N-1 and N\+1 compatibility/u);
	assert.match(localSkill, /kill switch/u);
	assert.match(localSkill, /safe default/u);
	assert.match(localSkill, /Run production preflight/u);
	assert.match(localSkill, /active incident/u);
	assert.match(localSkill, /rollback target digest/u);
	assert.match(localSkill, /canary cohort/u);
	assert.match(localSkill, /version-split telemetry/u);
	assert.match(localSkill, /global averages/u);
	assert.match(localSkill, /automatic stop conditions/u);
	assert.match(localSkill, /synthetic transactions/u);
	assert.match(localSkill, /release attribution/u);
	assert.match(localSkill, /deployment id/u);
	assert.match(localSkill, /cache key version/u);
	assert.match(localSkill, /deserialize new cache payloads/u);
	assert.match(localSkill, /Guard scheduler duplication/u);
	assert.match(localSkill, /CRDs and operators as schema rollouts/u);
	assert.match(localSkill, /operator downgrade/u);
	assert.match(localSkill, /deployment locks/u);
	assert.match(localSkill, /dry-run output/u);
	assert.match(localSkill, /post-deploy observation/u);
	assert.match(skillIndex, /\.mustflow\/skills\/deployment-rollout-safety-review\/SKILL\.md/u);
	assert.match(skillIndex, /deployment-rollout-safety-review/u);
	assert.match(skillIndex, /release envelope, image digest, deployment history, traffic rollback/u);
	assert.match(skillIndex, /rolled out, stopped, observed, and rolled back safely/u);
	assert.match(routes, /\[routes\."deployment-rollout-safety-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 78/u);
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
	assert.match(manifest, /"\.mustflow\/skills\/deployment-rollout-safety-review\/SKILL\.md"/u);
	assert.match(manifest, /"deployment-rollout-safety-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.deployment-rollout-safety-review"\][\s\S]*?revision = 3/u);
});

test('cloud cost guardrail review catches hidden spend channels', () => {
	const localSkill = readText('.mustflow/skills/cloud-cost-guardrail-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/cloud-cost-guardrail-review/SKILL.md',
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
	assert.match(localSkill, /blast-radius and guardrail problem/u);
	assert.match(localSkill, /logs, NAT, egress, snapshots/u);
	assert.match(localSkill, /Cost surface ledger/u);
	assert.match(localSkill, /Budget model/u);
	assert.match(localSkill, /Isolation model/u);
	assert.match(localSkill, /Quota and cap model/u);
	assert.match(localSkill, /Attribution model/u);
	assert.match(localSkill, /Network cost model/u);
	assert.match(localSkill, /Telemetry cost model/u);
	assert.match(localSkill, /Storage lifecycle model/u);
	assert.match(localSkill, /Commitment model/u);
	assert.match(localSkill, /Separate alerts from stops/u);
	assert.match(localSkill, /Budget alerts are signals, not circuit breakers/u);
	assert.match(localSkill, /25, 50, 75, 90, and 100 percent/u);
	assert.match(localSkill, /automated non-production action/u);
	assert.match(localSkill, /Reject imaginary provider spending limits/u);
	assert.match(localSkill, /Split billing blast radius/u);
	assert.match(localSkill, /Treat quotas as card limits/u);
	assert.match(localSkill, /cost allocation tags or labels/u);
	assert.match(localSkill, /expires_at/u);
	assert.match(localSkill, /Shut down the whole non-production stack/u);
	assert.match(localSkill, /Cap autoscaling and concurrency/u);
	assert.match(localSkill, /ResourceQuota/u);
	assert.match(localSkill, /LimitRange/u);
	assert.match(localSkill, /Remove avoidable NAT tolls/u);
	assert.match(localSkill, /Account for data transfer/u);
	assert.match(localSkill, /Audit public IPv4/u);
	assert.match(localSkill, /CDN and caches as cost controls/u);
	assert.match(localSkill, /Control log ingest before retention/u);
	assert.match(localSkill, /Protect metric cardinality/u);
	assert.match(localSkill, /raw user id/u);
	assert.match(localSkill, /Lifecycle object storage deliberately/u);
	assert.match(localSkill, /minimum storage duration/u);
	assert.match(localSkill, /Review block storage and snapshots/u);
	assert.match(localSkill, /database storage growth as sticky/u);
	assert.match(localSkill, /Clean container registries/u);
	assert.match(localSkill, /Buy commitments last/u);
	assert.match(localSkill, /spot or preemptible only for retryable work/u);
	assert.match(localSkill, /Marketplace, LLM, and SaaS costs separately/u);
	assert.match(localSkill, /cost stop runbook/u);
	assert.match(skillIndex, /\.mustflow\/skills\/cloud-cost-guardrail-review\/SKILL\.md/u);
	assert.match(skillIndex, /cloud-cost-guardrail review/u);
	assert.match(skillIndex, /spend can silently explode/u);
	assert.match(routes, /\[routes\."cloud-cost-guardrail-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 77/u);
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
	assert.match(manifest, /"\.mustflow\/skills\/cloud-cost-guardrail-review\/SKILL\.md"/u);
	assert.match(manifest, /"cloud-cost-guardrail-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.cloud-cost-guardrail-review"\][\s\S]*?revision = 2/u);
});

test('rate limit integrity review protects scarce resources without counter drift', () => {
	const localSkill = readText('.mustflow/skills/rate-limit-integrity-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/rate-limit-integrity-review/SKILL.md',
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
	assert.match(localSkill, /protected-resource fit/u);
	assert.match(localSkill, /Protected resource ledger/u);
	assert.match(localSkill, /Cost-weighted request ledger/u);
	assert.match(localSkill, /Layer model/u);
	assert.match(localSkill, /Key model/u);
	assert.match(localSkill, /Algorithm and storage model/u);
	assert.match(localSkill, /Failure mode model/u);
	assert.match(localSkill, /Response contract/u);
	assert.match(localSkill, /Observability and operator evidence/u);
	assert.match(localSkill, /Do not choose the algorithm first/u);
	assert.match(localSkill, /route templates/u);
	assert.match(localSkill, /raw URLs/u);
	assert.match(localSkill, /fixed window/u);
	assert.match(localSkill, /boundary burst/u);
	assert.match(localSkill, /Token bucket/u);
	assert.match(localSkill, /Sliding window counter/u);
	assert.match(localSkill, /Sliding window log/u);
	assert.match(localSkill, /Redis operation atomicity matters/u);
	assert.match(localSkill, /`INCR` plus `EXPIRE`/u);
	assert.match(localSkill, /hash slot/u);
	assert.match(localSkill, /hash tag/u);
	assert.match(localSkill, /storage time/u);
	assert.match(localSkill, /Local limits are not global limits/u);
	assert.match(localSkill, /Edge limits are not precise global counters/u);
	assert.match(localSkill, /fail open or fail closed per policy/u);
	assert.match(localSkill, /Count failed responses intentionally/u);
	assert.match(localSkill, /concurrency limit/u);
	assert.match(localSkill, /`Retry-After`/u);
	assert.match(localSkill, /`RateLimit`/u);
	assert.match(localSkill, /Add jitter/u);
	assert.match(localSkill, /Every counter needs a TTL/u);
	assert.match(localSkill, /blocked decisions/u);
	assert.match(localSkill, /do not cache allow/u);
	assert.match(localSkill, /shadow mode/u);
	assert.match(localSkill, /policy id/u);
	assert.match(localSkill, /operator lookup and reset/u);
	assert.match(localSkill, /raw Redis `DEL`/u);
	assert.match(localSkill, /Burn tokens before enqueueing async work/u);
	assert.match(localSkill, /cached CDN hits/u);
	assert.match(localSkill, /Rate limit is not authorization/u);
	assert.match(localSkill, /hard cost-control ceiling/u);
	assert.match(skillIndex, /\.mustflow\/skills\/rate-limit-integrity-review\/SKILL\.md/u);
	assert.match(skillIndex, /rate-limit integrity triage/u);
	assert.match(skillIndex, /protect a named resource without bypass/u);
	assert.match(routes, /\[routes\."rate-limit-integrity-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
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
	assert.match(manifest, /"\.mustflow\/skills\/rate-limit-integrity-review\/SKILL\.md"/u);
	assert.match(manifest, /"rate-limit-integrity-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.rate-limit-integrity-review"\][\s\S]*?revision = 2/u);
});

test('backend log evidence review reconstructs backend request and job paths', () => {
	const localSkill = readText('.mustflow/skills/backend-log-evidence-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/backend-log-evidence-review/SKILL.md',
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
	assert.match(localSkill, /reconstructing a request, job, or data mutation/u);
	assert.match(localSkill, /Reconstruction question/u);
	assert.match(localSkill, /event contract/u);
	assert.match(localSkill, /stable `event_name`/u);
	assert.match(localSkill, /schema version/u);
	assert.match(localSkill, /correlation and causation/u);
	assert.match(localSkill, /diagnostic envelope/u);
	assert.match(localSkill, /normal and failing event trails/u);
	assert.match(localSkill, /trace data is sampled out/i);
	assert.match(localSkill, /message-based dashboards/u);
	assert.match(localSkill, /high-cardinality indexed fields/u);
	assert.match(localSkill, /log injection exposure/u);
	assert.match(localSkill, /unsafe sampling/u);
	assert.match(localSkill, /request lifecycle evidence/u);
	assert.match(localSkill, /error and cause preservation/u);
	assert.match(localSkill, /DB affected rows/u);
	assert.match(localSkill, /transaction begin\/commit\/rollback/u);
	assert.match(localSkill, /silent early returns/u);
	assert.match(localSkill, /attempt-free retries/u);
	assert.match(localSkill, /duration-free timeouts/u);
	assert.match(localSkill, /queue enqueue and consume/u);
	assert.match(localSkill, /broken async request id/u);
	assert.match(localSkill, /batch summaries/u);
	assert.match(localSkill, /auth or validation failures/u);
	assert.match(localSkill, /cache hits or misses/u);
	assert.match(localSkill, /lock acquisition/u);
	assert.match(localSkill, /idempotency outcomes/u);
	assert.match(localSkill, /feature flags/u);
	assert.match(localSkill, /config startup summaries/u);
	assert.match(localSkill, /migration dry-run and apply logs/u);
	assert.match(localSkill, /duplicate error spam/u);
	assert.match(localSkill, /prose-only log/u);
	assert.match(localSkill, /sink-side-only masking/u);
	assert.match(skillIndex, /\.mustflow\/skills\/backend-log-evidence-review\/SKILL\.md/u);
	assert.match(skillIndex, /backend-log-evidence triage/u);
	assert.match(skillIndex, /structured events, correlation and causation IDs/u);
	assert.match(routes, /\[routes\."backend-log-evidence-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
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
		'docs_change',
		'package_metadata_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/backend-log-evidence-review\/SKILL\.md"/u);
	assert.match(manifest, /"backend-log-evidence-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.backend-log-evidence-review"\][\s\S]*?revision = 4/u);
});

test('Hetzner Cloud changes preserve provider-specific failure and recovery boundaries', () => {
	const localSkill = readText('.mustflow/skills/hetzner-cloud-change/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/hetzner-cloud-change/SKILL.md',
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
	assert.match(localSkill, /declared configuration, provider-accepted configuration, and observed runtime state/u);
	assert.match(localSkill, /A spread Placement Group reduces same-host concentration/u);
	assert.match(localSkill, /Private does not prove encrypted or filtered/u);
	assert.match(localSkill, /assigned allowlists combine/u);
	assert.match(localSkill, /no outbound rules means allow-all/u);
	assert.match(localSkill, /rule changes do not terminate connections/u);
	assert.match(localSkill, /Model the Network as routed L3/u);
	assert.match(localSkill, /configuration owner: provider image automation or explicit guest config/u);
	assert.match(localSkill, /Do not call it automatic failover/u);
	assert.match(localSkill, /DDoS filtering,\s+WAF behavior, application abuse control, and origin authentication distinct/u);
	assert.match(localSkill, /Do not promote an arbitrary utilization or PSI percentage/u);
	assert.match(localSkill, /Replication is availability, not history/u);
	assert.match(localSkill, /A Docker named volume is not a Hetzner Volume/u);
	assert.match(localSkill, /missing or wrong mount so an empty local directory cannot become a second database/u);
	assert.match(localSkill, /Object Storage as an object API, not POSIX/u);
	assert.match(localSkill, /pinned CCM and CSI versions or\s+digests/u);
	assert.match(localSkill, /Object Lock at bucket creation/u);
	assert.match(localSkill, /never benchmark a production raw block device destructively/u);
	assert.match(localSkill, /Prepare rebuild-first incident recovery/u);
	assert.match(localSkill, /account for active and powered-off compute/u);
	assert.match(localSkill, /time-sensitive values in\s+config or evidence, not as timeless prose/u);
	assert.match(skillIndex, /\.mustflow\/skills\/hetzner-cloud-change\/SKILL\.md/u);
	assert.match(routes, /\[routes\."hetzner-cloud-change"\]\r?\ncategory = "data_external"\r?\nroute_type = "primary"/u);
	assert.match(manifest, /"\.mustflow\/skills\/hetzner-cloud-change\/SKILL\.md"/u);
	assert.match(manifest, /"hetzner-cloud-change"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.hetzner-cloud-change"\][\s\S]*?revision = 2/u);
});

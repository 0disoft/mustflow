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

test('cache integrity review catches stale truth and source-protection risks', () => {
	const localSkill = readText('.mustflow/skills/cache-integrity-review/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/cache-integrity-review/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /second truth store/u);
	assert.match(localSkill, /viewer context/u);
	assert.match(localSkill, /login state/u);
	assert.match(localSkill, /membership tier/u);
	assert.match(localSkill, /country/u);
	assert.match(localSkill, /language/u);
	assert.match(localSkill, /A\/B test/u);
	assert.match(localSkill, /adult verification/u);
	assert.match(localSkill, /inventory policy/u);
	assert.match(localSkill, /query normalization/u);
	assert.match(localSkill, /`JSON\.stringify\(query\)`/u);
	assert.match(localSkill, /key version/u);
	assert.match(localSkill, /schema version/u);
	assert.match(localSkill, /TTL is not a guess/u);
	assert.match(localSkill, /jitter/u);
	assert.match(localSkill, /soft TTL/u);
	assert.match(localSkill, /hard TTL/u);
	assert.match(localSkill, /stale-while-revalidate/u);
	assert.match(localSkill, /singleflight/u);
	assert.match(localSkill, /request coalescing/u);
	assert.match(localSkill, /Negative cache/u);
	assert.match(localSkill, /`404`/u);
	assert.match(localSkill, /`403`/u);
	assert.match(localSkill, /temporary failure/u);
	assert.match(localSkill, /Delete-before-commit/u);
	assert.match(localSkill, /outbox-driven invalidation/u);
	assert.match(localSkill, /version compare/u);
	assert.match(localSkill, /CAS/u);
	assert.match(localSkill, /stale by the time the result applies/u);
	assert.match(localSkill, /Request coalescing is not obsolete-request discard/u);
	assert.match(localSkill, /partial entity overwrite/u);
	assert.match(localSkill, /summary response should not erase fields/u);
	assert.match(localSkill, /Optimistic state needs a before snapshot/u);
	assert.match(localSkill, /localStorage, IndexedDB, service workers/u);
	assert.match(localSkill, /SSR hydration payloads/u);
	assert.match(localSkill, /multi-tab, multi-device/u);
	assert.match(localSkill, /List caches/u);
	assert.match(localSkill, /cursor keys/u);
	assert.match(localSkill, /snapshot token/u);
	assert.match(localSkill, /tag-based invalidation/u);
	assert.match(localSkill, /global flush/u);
	assert.match(localSkill, /Local in-memory cache/u);
	assert.match(localSkill, /L1, L2, and DB/u);
	assert.match(localSkill, /rate limit/u);
	assert.match(localSkill, /load shedding/u);
	assert.match(localSkill, /circuit breaker/u);
	assert.match(localSkill, /Hit rate alone lies/u);
	assert.match(localSkill, /key-pattern/u);
	assert.match(localSkill, /tenant/u);
	assert.match(localSkill, /status-code/u);
	assert.match(localSkill, /miss cost/u);
	assert.match(localSkill, /fetchedAt/u);
	assert.match(localSkill, /lastInvalidatedAt/u);
	assert.match(localSkill, /lastMutationId/u);
	assert.match(localSkill, /isOptimistic/u);
	assert.match(localSkill, /isHydrated/u);
	assert.match(localSkill, /value size/u);
	assert.match(localSkill, /eviction policy/u);
	assert.match(localSkill, /TTL-less keys/u);
	assert.match(localSkill, /`KEYS \*`/u);
	assert.match(localSkill, /`SCAN`/u);
	assert.match(localSkill, /hot key/u);
	assert.match(localSkill, /hash tags/u);
	assert.match(localSkill, /`Vary`/u);
	assert.match(localSkill, /`no-cache`/u);
	assert.match(localSkill, /`no-store`/u);
	assert.match(localSkill, /permission cache/u);
	assert.match(localSkill, /cache warming/u);
	assert.match(localSkill, /deploy rollback/u);
	assert.match(skillIndex, /\.mustflow\/skills\/cache-integrity-review\/SKILL\.md/u);
	assert.match(skillIndex, /cache-integrity triage/u);
	assert.match(skillIndex, /stale data spread/u);
	assert.match(skillIndex, /Redis and HTTP cache semantics/u);
	assert.match(routes, /\[routes\."cache-integrity-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
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
	assert.match(manifest, /"\.mustflow\/skills\/cache-integrity-review\/SKILL\.md"/u);
	assert.match(manifest, /"cache-integrity-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.cache-integrity-review"\][\s\S]*?revision = 3/u);
});

test('quadratic scan review catches disguised pairwise scans and indexable joins', () => {
	const localSkill = readText('.mustflow/skills/quadratic-scan-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/quadratic-scan-review/SKILL.md',
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
	assert.match(localSkill, /hidden O\(N\^2\)/u);
	assert.match(localSkill, /same growing data from the beginning again/u);
	assert.match(localSkill, /`map` plus `filter`/u);
	assert.match(localSkill, /`map` plus `find`/u);
	assert.match(localSkill, /`forEach` plus `includes`/u);
	assert.match(localSkill, /`filter` plus `indexOf`/u);
	assert.match(localSkill, /`filter` plus `findIndex`/u);
	assert.match(localSkill, /helper-hidden `find`, `includes`, `some`, `filter`, `indexOf`/u);
	assert.match(localSkill, /`Set\.has` or `Map\.has`/u);
	assert.match(localSkill, /average sublinear/u);
	assert.match(localSkill, /setup, hashing, equality, memory, and resize costs/u);
	assert.match(localSkill, /code joins by ID/u);
	assert.match(localSkill, /duplicate removal/u);
	assert.match(localSkill, /Sorting does not make `find` fast/u);
	assert.match(localSkill, /Sorting a collection does not make exact lookup cheap/u);
	assert.match(localSkill, /expensive sort comparators/u);
	assert.match(localSkill, /calls `localeCompare` with options/u);
	assert.match(localSkill, /many times per item/u);
	assert.match(localSkill, /decorate-sort-undecorate/u);
	assert.match(localSkill, /`reduce` with `\[\.\.\.acc, item\]`/u);
	assert.match(localSkill, /JavaScript `shift\(\)`/u);
	assert.match(localSkill, /`unshift\(\)`/u);
	assert.match(localSkill, /swap the item with the last slot and `pop\(\)`/u);
	assert.match(localSkill, /`findIndex` plus `splice`/u);
	assert.match(localSkill, /repeated `concat`/u);
	assert.match(localSkill, /repeated string `\+=`/u);
	assert.match(localSkill, /Repeated `JSON\.stringify`/u);
	assert.match(localSkill, /helper bodies called from loops or render paths/u);
	assert.match(localSkill, /ORM and lazy relations/u);
	assert.match(localSkill, /GraphQL and nested resolvers/u);
	assert.match(localSkill, /render-time lookup/u);
	assert.match(localSkill, /tree and graph construction/u);
	assert.match(localSkill, /event-log and time-window scans/u);
	assert.match(localSkill, /interval overlap/u);
	assert.match(localSkill, /true all-pairs similarity/u);
	assert.match(localSkill, /n-grams/u);
	assert.match(localSkill, /index from cache/u);
	assert.match(localSkill, /hard cap/u);
	assert.match(skillIndex, /\.mustflow\/skills\/quadratic-scan-review\/SKILL\.md/u);
	assert.match(skillIndex, /specifically needs to catch hidden O\(N\^2\), pairwise work/u);
	assert.match(skillIndex, /array membership over growing data, ID join without index/u);
	assert.match(routes, /\[routes\."quadratic-scan-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 71/u);
	assertRouteReasonsText(routes, [
		'unknown_change',
		'code_change',
		'behavior_change',
		'test_change',
		'performance_change',
		'ui_change',
		'data_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/quadratic-scan-review\/SKILL\.md"/u);
	assert.match(manifest, /"quadratic-scan-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.quadratic-scan-review"\][\s\S]*?revision = 4/u);
});

test('type state modeling review makes impossible states unrepresentable', () => {
	const localSkill = readText('.mustflow/skills/type-state-modeling-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/type-state-modeling-review/SKILL.md',
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
	assert.match(localSkill, /impossible states unrepresentable/u);
	assert.match(localSkill, /branded types/u);
	assert.match(localSkill, /newtypes/u);
	assert.match(localSkill, /unit confusion/u);
	assert.match(localSkill, /currency/u);
	assert.match(localSkill, /boolean flag soup/u);
	assert.match(localSkill, /discriminated unions/u);
	assert.match(localSkill, /nullable and optional fields by state/u);
	assert.match(localSkill, /`status: string`/u);
	assert.match(localSkill, /Raw external API/u);
	assert.match(localSkill, /partial update inputs/u);
	assert.match(localSkill, /DTO\/domain\/response split/u);
	assert.match(localSkill, /Record<string, unknown>/u);
	assert.match(localSkill, /`any`/u);
	assert.match(localSkill, /non-null assertions/u);
	assert.match(localSkill, /Result<T, E>/u);
	assert.match(localSkill, /NonEmpty/u);
	assert.match(localSkill, /permission-result types/u);
	assert.match(localSkill, /createdAt\?/u);
	assert.match(localSkill, /`never`/u);
	assert.match(localSkill, /type-level tests/u);
	assert.match(skillIndex, /\.mustflow\/skills\/type-state-modeling-review\/SKILL\.md/u);
	assert.match(skillIndex, /make impossible states unrepresentable/u);
	assert.match(skillIndex, /swapped IDs, unit or currency confusion/u);
	assert.match(routes, /\[routes\."type-state-modeling-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 75/u);
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
	assert.match(manifest, /"\.mustflow\/skills\/type-state-modeling-review\/SKILL\.md"/u);
	assert.match(manifest, /"type-state-modeling-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.type-state-modeling-review"\][\s\S]*?revision = 1/u);
});

test('race condition review traces stale shared-state interleavings', () => {
	const localSkill = readText('.mustflow/skills/race-condition-review/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/race-condition-review/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /shared state/u);
	assert.match(localSkill, /Preserve the incident file/u);
	assert.match(localSkill, /random seed/u);
	assert.match(localSkill, /worker or thread count/u);
	assert.match(localSkill, /check-then-act/u);
	assert.match(localSkill, /read-modify-write/u);
	assert.match(localSkill, /stale read/u);
	assert.match(localSkill, /`await`/u);
	assert.match(localSkill, /lock scope/u);
	assert.match(localSkill, /global lock order/u);
	assert.match(localSkill, /`tryLock`/u);
	assert.match(localSkill, /idempotency/u);
	assert.match(localSkill, /cache miss fill/u);
	assert.match(localSkill, /lazy initialization/u);
	assert.match(localSkill, /double-checked locking/u);
	assert.match(localSkill, /atomic/u);
	assert.match(localSkill, /memory ordering/u);
	assert.match(localSkill, /conditional updates/u);
	assert.match(localSkill, /unique constraint/u);
	assert.match(localSkill, /distributed locks/u);
	assert.match(localSkill, /fencing tokens/u);
	assert.match(localSkill, /processing, succeeded, failed, cancelled, or dead/u);
	assert.match(localSkill, /duplicate arriving while the first attempt is still processing/u);
	assert.match(localSkill, /Business idempotency keys/u);
	assert.match(localSkill, /per-key serialization/u);
	assert.match(localSkill, /atomic create/u);
	assert.match(localSkill, /outbox/u);
	assert.match(localSkill, /Queue consumers/u);
	assert.match(localSkill, /Shutdown/u);
	assert.match(localSkill, /Cancellation/u);
	assert.match(localSkill, /Timers/u);
	assert.match(localSkill, /close\/send/u);
	assert.match(localSkill, /shared collections/u);
	assert.match(localSkill, /iterator/u);
	assert.match(localSkill, /snapshot/u);
	assert.match(localSkill, /Object pooling/u);
	assert.match(localSkill, /Fake immutable/u);
	assert.match(localSkill, /`sleep`-based race tests/u);
	assert.match(localSkill, /Shake the schedule, not only the load/u);
	assert.match(localSkill, /happens-before logs/u);
	assert.match(localSkill, /race detectors, thread sanitizers/u);
	assert.match(localSkill, /log order/iu);
	assert.match(localSkill, /state-machine review/u);
	assert.match(skillIndex, /\.mustflow\/skills\/race-condition-review\/SKILL\.md/u);
	assert.match(skillIndex, /race-condition triage for shared state/u);
	assert.match(skillIndex, /stale read after await/u);
	assert.match(skillIndex, /queue duplicate or out-of-order damage/u);
	assert.match(routes, /\[routes\."race-condition-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
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
	]);
	assert.match(manifest, /"\.mustflow\/skills\/race-condition-review\/SKILL\.md"/u);
	assert.match(manifest, /"race-condition-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.race-condition-review"\][\s\S]*?revision = 3/u);
});

test('async timing boundary review replaces arbitrary waits with completion signals', () => {
	const localSkill = readText('.mustflow/skills/async-timing-boundary-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/async-timing-boundary-review/SKILL.md',
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
	assert.match(localSkill, /arbitrary sleeps/u);
	assert.match(localSkill, /fixed delays/u);
	assert.match(localSkill, /event-loop yields/u);
	assert.match(localSkill, /render-frame or after-paint waits/u);
	assert.match(localSkill, /readiness polling/u);
	assert.match(localSkill, /Promise completion claims/u);
	assert.match(localSkill, /async one-time side effects/u);
	assert.match(localSkill, /eventual-consistency waits/u);
	assert.match(localSkill, /time_contract/u);
	assert.match(localSkill, /state_readiness/u);
	assert.match(localSkill, /`finish`/u);
	assert.match(localSkill, /`close`/u);
	assert.match(localSkill, /`fsync`/u);
	assert.match(localSkill, /health\/readiness checks/u);
	assert.match(localSkill, /bounded polling/u);
	assert.match(localSkill, /The awaited Promise must represent the real work/u);
	assert.match(localSkill, /Scheduling and backpressure model/u);
	assert.match(localSkill, /task, microtask, `process\.nextTick`, timer/u);
	assert.match(localSkill, /recursive `Promise\.resolve\(\)\.then\(\.\.\.\)`/u);
	assert.match(localSkill, /`queueMicrotask\(\.\.\.\)`/u);
	assert.match(localSkill, /starve rendering, input, timers, I\/O/u);
	assert.match(localSkill, /Yield long work at the right boundary/u);
	assert.match(localSkill, /feature-detected `scheduler\.yield`/u);
	assert.match(localSkill, /Treat `Promise\.all` as a failure-policy choice/u);
	assert.match(localSkill, /`allSettled`/u);
	assert.match(localSkill, /Define "once" by scope/u);
	assert.match(localSkill, /Guard stale async results before they apply/u);
	assert.match(localSkill, /generation, version, etag, sequence/u);
	assert.match(localSkill, /cancellation as a result state/u);
	assert.match(localSkill, /operation id, attempt, causation id/u);
	assert.match(localSkill, /scheduled, running, succeeded, failed, cancelled, and dead/u);
	assert.match(localSkill, /outbox-style publication/u);
	assert.match(localSkill, /inbox or dedupe/u);
	assert.match(localSkill, /per-key serialization/u);
	assert.match(localSkill, /fake timers/u);
	assert.match(localSkill, /response reorder, duplicate, drop, timeout, late success/u);
	assert.match(localSkill, /completion signal cannot be identified/u);
	assert.match(skillIndex, /\.mustflow\/skills\/async-timing-boundary-review\/SKILL\.md/u);
	assert.match(skillIndex, /tuned millisecond value/u);
	assert.match(skillIndex, /sleep as readiness/u);
	assert.match(skillIndex, /unbounded polling/u);
	assert.match(routes, /\[routes\."async-timing-boundary-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 78/u);
	assert.deepEqual(
		routeReasons(routes, 'async-timing-boundary-review'),
		[
			'unknown_change',
			'code_change',
			'behavior_change',
			'test_change',
			'public_api_change',
			'performance_change',
			'ui_change',
			'data_change',
			'migration_change',
			'package_metadata_change',
			'release_risk',
		],
	);
	assert.match(manifest, /"\.mustflow\/skills\/async-timing-boundary-review\/SKILL\.md"/u);
	for (const profileName of ['minimal', 'patterns', 'oss', 'team', 'product', 'library']) {
		assert.match(
			manifest,
			new RegExp(`${profileName} = \\[[\\s\\S]*?"async-timing-boundary-review"`, 'u'),
		);
	}
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.async-timing-boundary-review"\][\s\S]*?revision = 3/u);
});

test('concurrency invariant review checks time-order ownership and primitive discipline', () => {
	const localSkill = readText('.mustflow/skills/concurrency-invariant-review/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/concurrency-invariant-review/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /time order/u);
	assert.match(localSkill, /Shared state inventory/u);
	assert.match(localSkill, /owner/u);
	assert.match(localSkill, /invariant/u);
	assert.match(localSkill, /hidden writes/u);
	assert.match(localSkill, /getters/u);
	assert.match(localSkill, /lazy init/u);
	assert.match(localSkill, /check-then-act/u);
	assert.match(localSkill, /read-modify-write/u);
	assert.match(localSkill, /lock identity/u);
	assert.match(localSkill, /lock scope/u);
	assert.match(localSkill, /lock-order table/u);
	assert.match(localSkill, /runtime lock-order graph/u);
	assert.match(localSkill, /condition variable/u);
	assert.match(localSkill, /generation counters/u);
	assert.match(localSkill, /lost notification/u);
	assert.match(localSkill, /spurious wakeup/u);
	assert.match(localSkill, /`AtomicBoolean closed`/u);
	assert.match(localSkill, /ordinary `socket`, `buffer`, or `currentUser`/u);
	assert.match(localSkill, /ABA/u);
	assert.match(localSkill, /Double-checked locking/u);
	assert.match(localSkill, /object publication/u);
	assert.match(localSkill, /publish `this`/u);
	assert.match(localSkill, /fake immutability/u);
	assert.match(localSkill, /concurrent collection/u);
	assert.match(localSkill, /Cache `get-or-load`/u);
	assert.match(localSkill, /Application locks do not protect multi-instance uniqueness/u);
	assert.match(localSkill, /isolation level/u);
	assert.match(localSkill, /fencing tokens/u);
	assert.match(localSkill, /Retries and timeouts/u);
	assert.match(localSkill, /Queue consumers/u);
	assert.match(localSkill, /Status fields need allowed transitions/u);
	assert.match(localSkill, /scheduler/u);
	assert.match(localSkill, /shutdown/u);
	assert.match(localSkill, /permits must release/u);
	assert.match(localSkill, /deadlocks and starvation as wait-for systems/u);
	assert.match(localSkill, /wait-for graph/u);
	assert.match(localSkill, /thread-pool starvation/u);
	assert.match(localSkill, /Thread-local context is hidden global state/u);
	assert.match(localSkill, /every `await`/u);
	assert.match(localSkill, /`Thread\.sleep\(100\)` is not deterministic proof/u);
	assert.match(localSkill, /barriers, latches, fake schedulers, deterministic executors/u);
	assert.match(localSkill, /record\/replay, profiler, and kernel-scheduler diagnostics/u);
	assert.match(skillIndex, /\.mustflow\/skills\/concurrency-invariant-review\/SKILL\.md/u);
	assert.match(skillIndex, /concurrency-invariant triage for shared ownership/u);
	assert.match(skillIndex, /condition-variable `while` predicates/u);
	assert.match(skillIndex, /thread-local tenant leak/u);
	assert.match(routes, /\[routes\."concurrency-invariant-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 76/u);
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
	assert.match(manifest, /"\.mustflow\/skills\/concurrency-invariant-review\/SKILL\.md"/u);
	assert.match(manifest, /"concurrency-invariant-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.concurrency-invariant-review"\][\s\S]*?revision = 3/u);
});

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

test('memory lifetime review traces retained owners, cleanup symmetry, and repeated lifecycles', () => {
	const localSkill = readText('.mustflow/skills/memory-lifetime-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/memory-lifetime-review/SKILL.md',
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
	assert.match(localSkill, /retainer ledger/u);
	assert.match(localSkill, /long-lived owner/u);
	assert.match(localSkill, /short-lived object/u);
	assert.match(localSkill, /setup and cleanup symmetry/u);
	assert.match(localSkill, /addEventListener/u);
	assert.match(localSkill, /AbortSignal/u);
	assert.match(localSkill, /EventEmitter listeners/u);
	assert.match(localSkill, /setMaxListeners/u);
	assert.match(localSkill, /Promise\.race/u);
	assert.match(localSkill, /ThreadLocal/u);
	assert.match(localSkill, /context\.WithCancel/u);
	assert.match(localSkill, /shared_ptr/u);
	assert.match(localSkill, /Rc/u);
	assert.match(localSkill, /weak references/u);
	assert.match(localSkill, /first invalid access/u);
	assert.match(localSkill, /first sanitizer/u);
	assert.match(localSkill, /watchpoint, reverse-debugging, core dump/u);
	assert.match(localSkill, /Separate diagnostic build axes/u);
	assert.match(localSkill, /dangling references as ownership failures/u);
	assert.match(localSkill, /Preserve production crash evidence/u);
	assert.match(localSkill, /finalizers/u);
	assert.match(localSkill, /repeated-lifecycle proof/u);
	assert.match(skillIndex, /\.mustflow\/skills\/memory-lifetime-review\/SKILL\.md/u);
	assert.match(skillIndex, /Object lifetime, retained references, cleanup symmetry/u);
	assert.match(skillIndex, /timeout without cancellation, unbounded cache or queue/u);
	assert.match(routes, /\[routes\."memory-lifetime-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 73/u);
	assertRouteReasonsText(routes, [
		'unknown_change',
		'code_change',
		'behavior_change',
		'test_change',
		'performance_change',
		'ui_change',
		'security_change',
		'privacy_change',
		'data_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/memory-lifetime-review\/SKILL\.md"/u);
	assert.match(manifest, /"memory-lifetime-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.memory-lifetime-review"\][\s\S]*?revision = 2/u);
});

test('desktop memory footprint review separates resident numbers from owned memory', () => {
	const localSkill = readText('.mustflow/skills/desktop-memory-footprint-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/desktop-memory-footprint-review/SKILL.md',
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
	assert.match(localSkill, /scenario-level footprint/u);
	assert.match(localSkill, /working set/u);
	assert.match(localSkill, /private bytes/u);
	assert.match(localSkill, /RSS/u);
	assert.match(localSkill, /dirty memory/u);
	assert.match(localSkill, /live set/u);
	assert.match(localSkill, /peak state/u);
	assert.match(localSkill, /after-close state/u);
	assert.match(localSkill, /UI virtualization/u);
	assert.match(localSkill, /data virtualization/u);
	assert.match(localSkill, /container recycling/u);
	assert.match(localSkill, /WPF visual tree/u);
	assert.match(localSkill, /Qt `canFetchMore\(\)` and `fetchMore\(\)`/u);
	assert.match(localSkill, /Electron `BrowserWindow`/u);
	assert.match(localSkill, /WebView/u);
	assert.match(localSkill, /preload scripts/u);
	assert.match(localSkill, /`require\(\)` graphs/u);
	assert.match(localSkill, /decoded pixel bytes/u);
	assert.match(localSkill, /cache item cost/u);
	assert.match(localSkill, /total cost limit/u);
	assert.match(localSkill, /`NSCache` with `countLimit` and `totalCostLimit`/u);
	assert.match(localSkill, /memory-mapped files/u);
	assert.match(localSkill, /`madvise`/u);
	assert.match(localSkill, /`EmptyWorkingSet`/u);
	assert.match(localSkill, /85,000 byte LOH threshold/u);
	assert.match(localSkill, /`ArrayPool<T>`/u);
	assert.match(localSkill, /GDI or USER/u);
	assert.match(localSkill, /detached DOM/u);
	assert.match(localSkill, /DevTools/u);
	assert.match(localSkill, /console-retained objects/u);
	assert.match(localSkill, /string deduplication/u);
	assert.match(localSkill, /live set after old or full collection/u);
	assert.match(localSkill, /`clear\(\)` usually preserves capacity/u);
	assert.match(localSkill, /struct field order/u);
	assert.match(localSkill, /struct-of-arrays/u);
	assert.match(localSkill, /undo stacks/u);
	assert.match(localSkill, /operation logs/u);
	assert.match(localSkill, /piece-table/u);
	assert.match(localSkill, /low-memory handling/u);
	assert.match(localSkill, /after-close behavior/u);
	assert.match(skillIndex, /\.mustflow\/skills\/desktop-memory-footprint-review\/SKILL\.md/u);
	assert.match(skillIndex, /scenario-level review for Windows, macOS, Linux, Electron/u);
	assert.match(skillIndex, /working set versus private memory/u);
	assert.match(skillIndex, /working-set theater/u);
	assert.match(routes, /\[routes\."desktop-memory-footprint-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
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
		'ui_change',
		'docs_change',
		'package_metadata_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/desktop-memory-footprint-review\/SKILL\.md"/u);
	assert.match(manifest, /"desktop-memory-footprint-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.desktop-memory-footprint-review"\][\s\S]*?revision = 1/u);
});

test('hot path performance review counts repeated work, boundaries, and tail-risk smells', () => {
	const localSkill = readText('.mustflow/skills/hot-path-performance-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/hot-path-performance-review/SKILL.md',
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
	assert.match(localSkill, /cost ledger/u);
	assert.match(localSkill, /iteration count, data size, round-trip count, wait time/u);
	assert.match(localSkill, /allocation or GC churn/u);
	assert.match(localSkill, /repeated external access/u);
	assert.match(localSkill, /ORM relation access/u);
	assert.match(localSkill, /multi-pass collection code/u);
	assert.match(localSkill, /hidden quadratic lookup/u);
	assert.match(localSkill, /`SELECT \*`/u);
	assert.match(localSkill, /`OFFSET \.\.\. LIMIT \.\.\.`/u);
	assert.match(localSkill, /transaction and lock hold time/u);
	assert.match(localSkill, /Sequential `await`/u);
	assert.match(localSkill, /`Promise\.all` over thousands/u);
	assert.match(localSkill, /cache stampede/u);
	assert.match(localSkill, /Check allocation and GC churn/u);
	assert.match(localSkill, /`filter\(\)\.map\(\)\.reduce\(\)`/u);
	assert.match(localSkill, /`split\(\)\.map\(trim\)`/u);
	assert.match(localSkill, /repeated object spread while building indexes/u);
	assert.match(localSkill, /`Object\.values`/u);
	assert.match(localSkill, /heap growth/u);
	assert.match(localSkill, /GC pause/u);
	assert.match(localSkill, /`JSON\.parse\(JSON\.stringify\(\.\.\.\)\)`/u);
	assert.match(localSkill, /retry and timeout multiplication/u);
	assert.match(localSkill, /p95 or p99/u);
	assert.match(skillIndex, /\.mustflow\/skills\/hot-path-performance-review\/SKILL\.md/u);
	assert.match(skillIndex, /Code review or implementation needs hot-path triage/u);
	assert.match(skillIndex, /repeated I\/O in loops, N\+1 query, multi-pass array traversal/u);
	assert.match(routes, /\[routes\."hot-path-performance-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 72/u);
	assertRouteReasonsText(routes, [
		'unknown_change',
		'code_change',
		'behavior_change',
		'test_change',
		'performance_change',
		'ui_change',
		'data_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/hot-path-performance-review\/SKILL\.md"/u);
	assert.match(manifest, /"hot-path-performance-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.hot-path-performance-review"\][\s\S]*?revision = 2/u);
});

test('api request performance review counts per-request fan-out and latency evidence', () => {
	const localSkill = readText('.mustflow/skills/api-request-performance-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/api-request-performance-review/SKILL.md',
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
	assert.match(localSkill, /per-request I\/O/u);
	assert.match(localSkill, /Request cost ledger/u);
	assert.match(localSkill, /DB query count/u);
	assert.match(localSkill, /Redis/u);
	assert.match(localSkill, /external API/u);
	assert.match(localSkill, /actual SQL/u);
	assert.match(localSkill, /query count/u);
	assert.match(localSkill, /repeated `SELECT \.\.\. WHERE id = \?`/u);
	assert.match(localSkill, /ORM serializer/u);
	assert.match(localSkill, /lazy loading/u);
	assert.match(localSkill, /Django/u);
	assert.match(localSkill, /select_related/u);
	assert.match(localSkill, /prefetch_related/u);
	assert.match(localSkill, /Rails/u);
	assert.match(localSkill, /strict_loading/u);
	assert.match(localSkill, /eager loading/u);
	assert.match(localSkill, /`SELECT \*`/u);
	assert.match(localSkill, /deep `OFFSET`/u);
	assert.match(localSkill, /`COUNT\(\*\)`/u);
	assert.match(localSkill, /EXPLAIN/u);
	assert.match(localSkill, /estimated rows/u);
	assert.match(localSkill, /actual rows/u);
	assert.match(localSkill, /do not trust `include` as a performance proof/u);
	assert.match(localSkill, /repeated `count`, `exists`, `sum`, `latest`, or `first`/u);
	assert.match(localSkill, /composite indexes/u);
	assert.match(localSkill, /Expression indexes/u);
	assert.match(localSkill, /partial or filtered indexes/u);
	assert.match(localSkill, /covering or index-only access/u);
	assert.match(localSkill, /pool acquire/u);
	assert.match(localSkill, /MGET/u);
	assert.match(localSkill, /pipeline/u);
	assert.match(localSkill, /cache miss/u);
	assert.match(localSkill, /JSON serialization/u);
	assert.match(localSkill, /response bytes/u);
	assert.match(localSkill, /transaction/u);
	assert.match(localSkill, /OpenTelemetry/u);
	assert.match(localSkill, /span/u);
	assert.match(localSkill, /route span/u);
	assert.match(localSkill, /Node/u);
	assert.match(localSkill, /flame graph/u);
	assert.match(localSkill, /Go/u);
	assert.match(localSkill, /pprof/u);
	assert.match(localSkill, /MongoDB/u);
	assert.match(localSkill, /explain\(\)/u);
	assert.match(skillIndex, /\.mustflow\/skills\/api-request-performance-review\/SKILL\.md/u);
	assert.match(skillIndex, /per-request latency review/u);
	assert.match(skillIndex, /general hot-path repetition/u);
	assert.match(routes, /\[routes\."api-request-performance-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 73/u);
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
	]);
	assert.match(manifest, /"\.mustflow\/skills\/api-request-performance-review\/SKILL\.md"/u);
	assert.match(manifest, /"api-request-performance-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.api-request-performance-review"\][\s\S]*?revision = 2/u);
});

test('web render performance review protects first render and Core Web Vitals', () => {
	const localSkill = readText('.mustflow/skills/web-render-performance-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/web-render-performance-review/SKILL.md',
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
	assert.match(localSkill, /critical rendering path/u);
	assert.match(localSkill, /First viewport and LCP candidate ledger/u);
	assert.match(localSkill, /Critical resource discovery ledger/u);
	assert.match(localSkill, /CSS and render-blocking ledger/u);
	assert.match(localSkill, /Font loading ledger/u);
	assert.match(localSkill, /Image, video, and iframe ledger/u);
	assert.match(localSkill, /Third-party script ledger/u);
	assert.match(localSkill, /JavaScript bundle and hydration ledger/u);
	assert.match(localSkill, /Data and HTML delivery ledger/u);
	assert.match(localSkill, /Cache, compression, and resource-hint ledger/u);
	assert.match(localSkill, /Main-thread and long-task ledger/u);
	assert.match(localSkill, /Identify the LCP candidate/u);
	assert.match(localSkill, /Do not lazy-load the LCP image/u);
	assert.match(localSkill, /Preload background hero images/u);
	assert.match(localSkill, /Budget `fetchpriority`/u);
	assert.match(localSkill, /Inline only critical CSS/u);
	assert.match(localSkill, /Split route CSS/u);
	assert.match(localSkill, /Choose `font-display` deliberately/u);
	assert.match(localSkill, /Preload only first-view fonts/u);
	assert.match(localSkill, /Subset Korean and CJK fonts/u);
	assert.match(localSkill, /Use `srcset` and `sizes`/u);
	assert.match(localSkill, /Reserve space for lazy media/u);
	assert.match(localSkill, /Gate third-party scripts/u);
	assert.match(localSkill, /Keep `use client` boundaries narrow/u);
	assert.match(localSkill, /Lazy-load heavy interactive widgets/u);
	assert.match(localSkill, /Do not fetch first-view data in a client effect/u);
	assert.match(localSkill, /Stream HTML and shell early/u);
	assert.match(localSkill, /Split static shells from dynamic holes/u);
	assert.match(localSkill, /Investigate slow TTFB/u);
	assert.match(localSkill, /Cache HTML at the edge/u);
	assert.match(localSkill, /Cache fingerprinted assets/u);
	assert.match(localSkill, /Enable text compression/u);
	assert.match(localSkill, /Use Early Hints and preconnect sparingly/u);
	assert.match(localSkill, /Use `content-visibility: auto`/u);
	assert.match(localSkill, /Break long main-thread tasks/u);
	assert.match(localSkill, /Audit route prefetch behavior/u);
	assert.match(skillIndex, /\.mustflow\/skills\/web-render-performance-review\/SKILL\.md/u);
	assert.match(skillIndex, /web-render-performance triage/u);
	assert.match(skillIndex, /lab-only perf claim/u);
	assert.match(routes, /\[routes\."web-render-performance-review"\]\r?\ncategory = "ui_assets"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 79/u);
	assertRouteReasonsText(routes, [
		'ui_change',
		'performance_change',
		'behavior_change',
		'code_change',
		'web_asset_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/web-render-performance-review\/SKILL\.md"/u);
	assert.match(manifest, /"web-render-performance-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.web-render-performance-review"\][\s\S]*?revision = 1/u);
});

test('core web vitals field review treats CWV as real-user percentile operations', () => {
	const localSkill = readText('.mustflow/skills/core-web-vitals-field-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/core-web-vitals-field-review/SKILL.md',
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
	assert.match(localSkill, /field-data operating contract/u);
	assert.match(localSkill, /75th percentile/u);
	assert.match(localSkill, /mobile and desktop separately/u);
	assert.match(localSkill, /LCP at or below 2\.5 seconds/u);
	assert.match(localSkill, /INP at or below 200 milliseconds/u);
	assert.match(localSkill, /CLS at or below 0\.1/u);
	assert.match(localSkill, /INP replaced FID/u);
	assert.match(localSkill, /2024-03-12/u);
	assert.match(localSkill, /RUM/u);
	assert.match(localSkill, /CrUX/u);
	assert.match(localSkill, /Search Console/u);
	assert.match(localSkill, /Lighthouse-versus-field gaps/u);
	assert.match(localSkill, /TTFB, resource load delay, resource load duration, and element render delay/u);
	assert.match(localSkill, /Long Animation Frames/u);
	assert.match(localSkill, /GTM and marketing tags/u);
	assert.match(localSkill, /skeletons to final geometry/u);
	assert.match(localSkill, /bfcache eligibility/u);
	assert.match(localSkill, /speculation rules/u);
	assert.match(localSkill, /p75 INP/u);
	assert.match(localSkill, /field, lab, configured-test evidence, static risk/u);
	assert.match(skillIndex, /\.mustflow\/skills\/core-web-vitals-field-review\/SKILL\.md/u);
	assert.match(skillIndex, /Core Web Vitals needs field-data/u);
	assert.match(skillIndex, /Lighthouse trophy claim/u);
	assert.match(routes, /\[routes\."core-web-vitals-field-review"\]\r?\ncategory = "ui_assets"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 81/u);
	assertRouteReasonsText(routes, [
		'ui_change',
		'performance_change',
		'behavior_change',
		'code_change',
		'web_asset_change',
		'docs_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/core-web-vitals-field-review\/SKILL\.md"/u);
	assert.match(manifest, /"core-web-vitals-field-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.core-web-vitals-field-review"\][\s\S]*?revision = 1/u);
});

test('image delivery performance review catches discovery, candidate, cache, and safety risks', () => {
	const localSkill = readText('.mustflow/skills/image-delivery-performance-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/image-delivery-performance-review/SKILL.md',
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
	assert.match(localSkill, /delivery and discovery problem/u);
	assert.match(localSkill, /Image role ledger/u);
	assert.match(localSkill, /Discovery and priority ledger/u);
	assert.match(localSkill, /Responsive candidate ledger/u);
	assert.match(localSkill, /Layout stability ledger/u);
	assert.match(localSkill, /Format and quality ledger/u);
	assert.match(localSkill, /Pipeline and metadata ledger/u);
	assert.match(localSkill, /CDN and cache ledger/u);
	assert.match(localSkill, /Safety and abuse ledger/u);
	assert.match(localSkill, /Do not lazy-load the LCP image/u);
	assert.match(localSkill, /`fetchpriority="high"`/u);
	assert.match(localSkill, /responsive preload/u);
	assert.match(localSkill, /`imagesrcset` and `imagesizes`/u);
	assert.match(localSkill, /Do not preload every format/u);
	assert.match(localSkill, /Treat `sizes` as the slot contract/u);
	assert.match(localSkill, /fill-style responsive images/u);
	assert.match(localSkill, /`sizes="auto"`/u);
	assert.match(localSkill, /Reserve image geometry/u);
	assert.match(localSkill, /DPR and width buckets/u);
	assert.match(localSkill, /cache-key confetti/u);
	assert.match(localSkill, /Choose format by image content/u);
	assert.match(localSkill, /JPEG fallback/u);
	assert.match(localSkill, /quality per format and image role/u);
	assert.match(localSkill, /byte budgets and visual evidence/u);
	assert.match(localSkill, /Apply orientation before stripping metadata/u);
	assert.match(localSkill, /Preserve color intentionally/u);
	assert.match(localSkill, /user-uploaded SVG/u);
	assert.match(localSkill, /Use markup for meaningful images/u);
	assert.match(localSkill, /Preload CSS background LCP images/u);
	assert.match(localSkill, /Lazy-load below-fold images/u);
	assert.match(localSkill, /giant lazy gallery/u);
	assert.match(localSkill, /`decoding="async"`/u);
	assert.match(localSkill, /Keep blur placeholders tiny/u);
	assert.match(localSkill, /Inline base64 only for tiny assets/u);
	assert.match(localSkill, /content-hash URLs/u);
	assert.match(localSkill, /Keep originals/u);
	assert.match(localSkill, /Preserve `Accept`/u);
	assert.match(localSkill, /Lock down image optimization APIs/u);
	assert.match(localSkill, /Check the waterfall/u);
	assert.match(skillIndex, /\.mustflow\/skills\/image-delivery-performance-review\/SKILL\.md/u);
	assert.match(skillIndex, /image-delivery-performance triage/u);
	assert.match(skillIndex, /dropped `Accept` header/u);
	assert.match(routes, /\[routes\."image-delivery-performance-review"\]\r?\ncategory = "ui_assets"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 82/u);
	assertRouteReasonsText(routes, [
		'ui_change',
		'performance_change',
		'behavior_change',
		'code_change',
		'web_asset_change',
		'security_change',
		'privacy_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/image-delivery-performance-review\/SKILL\.md"/u);
	assert.match(manifest, /"image-delivery-performance-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.image-delivery-performance-review"\][\s\S]*?revision = 1/u);
});

test('client bundle pruning review catches tree-shaking blockers and initial JS bloat', () => {
	const localSkill = readText('.mustflow/skills/client-bundle-pruning-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/client-bundle-pruning-review/SKILL.md',
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
	assert.match(localSkill, /code shapes that keep bundlers from deleting unused client code/u);
	assert.match(localSkill, /Bundle target ledger/u);
	assert.match(localSkill, /Entry and import graph ledger/u);
	assert.match(localSkill, /Dependency format ledger/u);
	assert.match(localSkill, /Framework boundary ledger/u);
	assert.match(localSkill, /Heavy-feature ledger/u);
	assert.match(localSkill, /Polyfill and target ledger/u);
	assert.match(localSkill, /first-route JavaScript/u);
	assert.match(localSkill, /failing bundle budget/u);
	assert.match(localSkill, /non-ESM packages/u);
	assert.match(localSkill, /broad utility imports/u);
	assert.match(localSkill, /barrel files on hot client paths/u);
	assert.match(localSkill, /subpath exports/u);
	assert.match(localSkill, /`sideEffects` metadata/u);
	assert.match(localSkill, /`moduleSideEffects: false`/u);
	assert.match(localSkill, /PURE annotations/u);
	assert.match(localSkill, /Move client boundaries inward/u);
	assert.match(localSkill, /Server Components or server-only code/u);
	assert.match(localSkill, /dynamic imports statically analyzable/u);
	assert.match(localSkill, /`React\.lazy`/u);
	assert.match(localSkill, /optional heavy widgets/u);
	assert.match(localSkill, /event or visibility point/u);
	assert.match(localSkill, /Angular `@defer`/u);
	assert.match(localSkill, /Vue route lazy loading/u);
	assert.match(localSkill, /import modularization/u);
	assert.match(localSkill, /Audit icon imports/u);
	assert.match(localSkill, /Audit date locales/u);
	assert.match(localSkill, /syntax highlighters, markdown processors, and code editors/u);
	assert.match(localSkill, /Node polyfills/u);
	assert.match(localSkill, /Modernize browser targets/u);
	assert.match(localSkill, /broad Babel polyfill imports/u);
	assert.match(localSkill, /dev-only branches fold/u);
	assert.match(localSkill, /Remove console calls safely/u);
	assert.match(localSkill, /one giant vendor chunk/u);
	assert.match(localSkill, /Vite modulepreload behavior/u);
	assert.match(localSkill, /Tailwind and utility extraction/u);
	assert.match(localSkill, /inline asset thresholds/u);
	assert.match(skillIndex, /\.mustflow\/skills\/client-bundle-pruning-review\/SKILL\.md/u);
	assert.match(skillIndex, /client-bundle-pruning triage/u);
	assert.match(skillIndex, /unmeasured bundle claim/u);
	assert.match(routes, /\[routes\."client-bundle-pruning-review"\]\r?\ncategory = "ui_assets"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 80/u);
	assertRouteReasonsText(routes, [
		'ui_change',
		'performance_change',
		'behavior_change',
		'code_change',
		'package_metadata_change',
		'web_asset_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/client-bundle-pruning-review\/SKILL\.md"/u);
	assert.match(manifest, /"client-bundle-pruning-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.client-bundle-pruning-review"\][\s\S]*?revision = 1/u);
});

test('frame render performance review catches layout, paint, and INP frame risks', () => {
	const localSkill = readText('.mustflow/skills/frame-render-performance-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/frame-render-performance-review/SKILL.md',
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
	assert.match(localSkill, /per-frame work/u);
	assert.match(localSkill, /Interaction and frame ledger/u);
	assert.match(localSkill, /DOM and layout ledger/u);
	assert.match(localSkill, /Style and CSS ledger/u);
	assert.match(localSkill, /Paint and compositing ledger/u);
	assert.match(localSkill, /Event and scheduling ledger/u);
	assert.match(localSkill, /Framework render ledger/u);
	assert.match(localSkill, /forced synchronous layout/u);
	assert.match(localSkill, /layout thrashing/u);
	assert.match(localSkill, /Prefer `transform` and `opacity`/u);
	assert.match(localSkill, /temporary hint/u);
	assert.match(localSkill, /content-visibility: auto/u);
	assert.match(localSkill, /contain-intrinsic-size/u);
	assert.match(localSkill, /Virtualize long lists/u);
	assert.match(localSkill, /DOM depth and breadth/u);
	assert.match(localSkill, /Simplify selectors/u);
	assert.match(localSkill, /global class toggles/u);
	assert.match(localSkill, /CSS variables/u);
	assert.match(localSkill, /Reserve media, ad, and embed geometry/u);
	assert.match(localSkill, /native lazy loading/u);
	assert.match(localSkill, /IntersectionObserver/u);
	assert.match(localSkill, /passive wheel, touch, and scroll listeners/u);
	assert.match(localSkill, /overscroll-behavior/u);
	assert.match(localSkill, /requestAnimationFrame/u);
	assert.match(localSkill, /Split long tasks/u);
	assert.match(localSkill, /worker/u);
	assert.match(localSkill, /OffscreenCanvas/u);
	assert.match(localSkill, /ResizeObserver/u);
	assert.match(localSkill, /runtime CSS rule churn/u);
	assert.match(localSkill, /React `memo`/u);
	assert.match(localSkill, /Split React context/u);
	assert.match(localSkill, /deferred rendering or transitions/u);
	assert.match(localSkill, /Narrow hydration/u);
	assert.match(localSkill, /DevTools Performance/u);
	assert.match(skillIndex, /\.mustflow\/skills\/frame-render-performance-review\/SKILL\.md/u);
	assert.match(skillIndex, /frame-render-performance triage/u);
	assert.match(skillIndex, /Lighthouse-score-only claim/u);
	assert.match(routes, /\[routes\."frame-render-performance-review"\]\r?\ncategory = "ui_assets"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 81/u);
	assertRouteReasonsText(routes, [
		'ui_change',
		'performance_change',
		'behavior_change',
		'code_change',
		'web_asset_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/frame-render-performance-review\/SKILL\.md"/u);
	assert.match(manifest, /"frame-render-performance-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.frame-render-performance-review"\][\s\S]*?revision = 1/u);
});

test('motion system contract review catches animation state and settlement risks', () => {
	const localSkill = readText('.mustflow/skills/motion-system-contract-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/motion-system-contract-review/SKILL.md',
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
	assert.match(localSkill, /state-transition contract/u);
	assert.match(localSkill, /Motion must not own product state/u);
	assert.match(localSkill, /interaction, component-state, signal, viewport, or timer/u);
	assert.match(localSkill, /async success and failure motion/u);
	assert.match(localSkill, /from-state and to-state/u);
	assert.match(localSkill, /same target and channel/u);
	assert.match(localSkill, /additive composition/u);
	assert.match(localSkill, /layout channels off by default/u);
	assert.match(localSkill, /animation-fill-mode: forwards/u);
	assert.match(localSkill, /reduced motion/u);
	assert.match(localSkill, /hover and fine-pointer capability/u);
	assert.match(localSkill, /role\/ref\/slot\/data binding/u);
	assert.match(localSkill, /skip-effect-and-report/u);
	assert.match(skillIndex, /\.mustflow\/skills\/motion-system-contract-review\/SKILL\.md/u);
	assert.match(skillIndex, /motion owns product state/u);
	assert.match(skillIndex, /false success or failure feedback/u);
	assert.match(skillIndex, /remaining motion contract risk/u);
	assert.match(routes, /\[routes\."motion-system-contract-review"\]\r?\ncategory = "ui_assets"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 83/u);
	assertRouteReasonsText(routes, [
		'ui_change',
		'behavior_change',
		'code_change',
		'performance_change',
		'test_change',
		'docs_change',
		'web_asset_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/motion-system-contract-review\/SKILL\.md"/u);
	assert.match(manifest, /"motion-system-contract-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.motion-system-contract-review"\][\s\S]*?revision = 1/u);
});

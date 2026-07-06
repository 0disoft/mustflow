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

test('Astro code change skill gates islands, rendering, content, and runtime risk', () => {
	const localSkill = readText('.mustflow/skills/astro-code-change/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/astro-code-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /current and target Astro major versions/u);
	assert.match(localSkill, /official Astro upgrade guide for each crossed major/u);
	assert.match(localSkill, /`output: "hybrid"` as stale migration input/u);
	assert.match(localSkill, /`output: "static"` with route-level `prerender = false`/u);
	assert.match(localSkill, /`src\/fetch\.ts` and `src\/fetch\.js` as reserved/u);
	assert.match(localSkill, /request pipeline ledger/u);
	assert.match(localSkill, /Do not create `src\/fetch\.ts` or `src\/fetch\.js` just because/u);
	assert.match(localSkill, /## Server Island Policy/u);
	assert.match(localSkill, /Pin `ASTRO_KEY`/u);
	assert.match(localSkill, /Do not cache personalized server island HTML publicly/u);
	assert.match(localSkill, /server island contains SEO-critical page meaning/u);
	assert.match(localSkill, /Use `client:visible` for below-the-fold or heavy widgets/u);
	assert.match(localSkill, /Do not pass large CMS payloads/u);
	assert.match(localSkill, /Treat `cache` and `routeRules` changes as data-exposure risks/u);
	assert.match(localSkill, /authenticated, personalized, locale-sensitive/u);
	assert.match(localSkill, /Cache providers, CDN cache providers, invalidation tags/u);
	assert.match(localSkill, /Markdown, Markdoc, Shiki, And Compiler Policy/u);
	assert.match(localSkill, /unified pipeline/u);
	assert.match(localSkill, /MDX optimizer changes/u);
	assert.match(localSkill, /Markdoc `allowHTML`/u);
	assert.match(localSkill, /Do not create Shiki highlighters in hot loops/u);
	assert.match(localSkill, /invalid HTML nesting/u);
	assert.match(localSkill, /`compressHTML`/u);
	assert.match(localSkill, /Do not trust `getCollection\(\)` order/u);
	assert.match(localSkill, /Centralize published\/draft filtering/u);
	assert.match(localSkill, /Custom loaders must validate data with the collection schema/u);
	assert.match(localSkill, /## Adapter And Runtime Policy/u);
	assert.match(localSkill, /edge runtimes/u);
	assert.match(localSkill, /target adapter preview/u);
	assert.match(localSkill, /For v6 to v7 migrations/u);
	assert.match(localSkill, /`getContainerRenderer\(\)` imports from integration roots/u);
	assert.match(skillIndex, /server islands/u);
	assert.match(skillIndex, /stale `output: "hybrid"` migration/u);
	assert.match(skillIndex, /`src\/fetch\.\*`/u);
	assert.match(skillIndex, /route cache/u);
	assert.match(skillIndex, /Markdoc/u);
	assert.match(skillIndex, /Shiki/u);
	assert.match(skillIndex, /cache data exposure/u);
	assert.match(routes, /\[routes\."astro-code-change"\]\r?\ncategory = "ui_assets"\r?\nroute_type = "primary"\r?\npriority = 85/u);
	for (const reason of [
		'ui_change',
		'docs_change',
		'code_change',
		'behavior_change',
		'public_api_change',
		'data_change',
		'security_change',
		'privacy_change',
		'performance_change',
		'test_change',
		'migration_change',
		'package_metadata_change',
		'release_risk',
	]) {
		assert.ok(routeReasons(routes, 'astro-code-change').includes(reason), `missing route reason ${reason}`);
	}
	assert.match(manifest, /"\.mustflow\/skills\/astro-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"astro-code-change"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.astro-code-change"\][\s\S]*?revision = 5/u);
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
	assertRouteReasonsText(routes, [
		'ui_change',
		'performance_change',
		'behavior_change',
		'code_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/frontend-render-stability\/SKILL\.md"/u);
	assert.match(manifest, /"frontend-render-stability"/u);
	assert.match(i18n, /\[documents\."skill\.frontend-render-stability"\]/u);
});

test('frontend state ownership review maps source-of-truth drift', () => {
	const localSkill = readText('.mustflow/skills/frontend-state-ownership-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/frontend-state-ownership-review/SKILL.md',
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
	assert.match(localSkill, /State owner ledger/u);
	assert.match(localSkill, /server data, URL-owned state, local UI state, form draft/u);
	assert.match(localSkill, /`useState\(props`/u);
	assert.match(localSkill, /derived values/u);
	assert.match(localSkill, /`useEffect\(\(\) => setX/u);
	assert.match(localSkill, /one `status`, `mode`, state machine, or discriminated union/u);
	assert.match(localSkill, /Store identifiers, not stale objects/u);
	assert.match(localSkill, /`selectedId`/u);
	assert.match(localSkill, /Do not copy TanStack Query, SWR, Apollo/u);
	assert.match(localSkill, /query key includes every condition/u);
	assert.match(localSkill, /URL-owned state/u);
	assert.match(localSkill, /form draft/u);
	assert.match(localSkill, /optimistic update needs rollback/u);
	assert.match(localSkill, /AbortController/u);
	assert.match(localSkill, /Mutation invalidation/u);
	assert.match(localSkill, /index keys/u);
	assert.match(localSkill, /Use `key` resets/u);
	assert.match(localSkill, /Context value identity/u);
	assert.match(localSkill, /raw setters/u);
	assert.match(localSkill, /Persisted stores need serializable values, schema versioning, migrations/u);
	assert.match(localSkill, /useSyncExternalStore/u);
	assert.match(skillIndex, /\.mustflow\/skills\/frontend-state-ownership-review\/SKILL\.md/u);
	assert.match(skillIndex, /frontend state can drift across props/u);
	assert.match(skillIndex, /props-to-state drift/u);
	assert.match(routes, /\[routes\."frontend-state-ownership-review"\]\r?\ncategory = "ui_assets"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 80/u);
	assertRouteReasonsText(routes, [
		'ui_change',
		'behavior_change',
		'code_change',
		'performance_change',
		'data_change',
		'test_change',
		'public_api_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/frontend-state-ownership-review\/SKILL\.md"/u);
	assert.match(manifest, /"frontend-state-ownership-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.frontend-state-ownership-review"\][\s\S]*?revision = 1/u);
});

test('split refactor residual path review catches old execution paths after file splits', () => {
	const localSkill = readText('.mustflow/skills/split-refactor-residual-path-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/split-refactor-residual-path-review/SKILL.md',
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
	assert.match(localSkill, /old path lost authority/u);
	assert.match(localSkill, /old execution paths/u);
	assert.match(localSkill, /Residual keyword ledger/u);
	assert.match(localSkill, /`onClick`, `onChange`, `addEventListener`/u);
	assert.match(localSkill, /Check single ownership of the event path/u);
	assert.match(localSkill, /Trace state mutation authority/u);
	assert.match(localSkill, /feature flags and fallback paths/u);
	assert.match(localSkill, /A unit test that calls the new module directly is not enough/u);
	assert.match(localSkill, /Add duplicate-execution tests/u);
	assert.match(localSkill, /Add lifecycle and cleanup evidence/u);
	assert.match(localSkill, /Check ordering/u);
	assert.match(localSkill, /Add structural guardrails/u);
	assert.match(skillIndex, /\.mustflow\/skills\/split-refactor-residual-path-review\/SKILL\.md/u);
	assert.match(skillIndex, /old execution paths no longer handle the same responsibility/u);
	assert.match(skillIndex, /remaining residual-path risk/u);
	assert.match(routes, /\[routes\."split-refactor-residual-path-review"\]\r?\ncategory = "architecture_patterns"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 79/u);
	assert.deepEqual(routeReasons(routes, 'split-refactor-residual-path-review'), [
		'unknown_change',
		'code_change',
		'behavior_change',
		'test_change',
		'public_api_change',
		'performance_change',
		'ui_change',
		'data_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/split-refactor-residual-path-review\/SKILL\.md"/u);
	for (const profileName of ['minimal', 'patterns', 'oss', 'team', 'product', 'library']) {
		assert.match(
			manifest,
			new RegExp(`${profileName} = \\[[\\s\\S]*?"split-refactor-residual-path-review"`, 'u'),
		);
	}
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.split-refactor-residual-path-review"\][\s\S]*?revision = 1/u);
});

test('ui state resurrection review traces restored UI state after completion or restart', () => {
	const localSkill = readText('.mustflow/skills/ui-state-resurrection-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/ui-state-resurrection-review/SKILL.md',
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
	assert.match(localSkill, /newly created, or did an old stored record regain authority/u);
	assert.match(localSkill, /`message\.complete`/u);
	assert.match(localSkill, /localStorage, sessionStorage, IndexedDB, CacheStorage/u);
	assert.match(localSkill, /desktop user-data SQLite, JSON, LevelDB/u);
	assert.match(localSkill, /mobile shared preferences/u);
	assert.match(localSkill, /`openPanels`/u);
	assert.match(localSkill, /`streamingMessage`/u);
	assert.match(localSkill, /`completedStreamIds`/u);
	assert.match(localSkill, /`lastCompletedEventSeq`/u);
	assert.match(localSkill, /tombstone or watermark/u);
	assert.match(localSkill, /delayed persisted writes/u);
	assert.match(localSkill, /blind shallow merges/u);
	assert.match(localSkill, /event sequence, server version, message version, run ID/u);
	assert.match(localSkill, /cross-device sync overwrite/u);
	assert.match(localSkill, /crash recovery files/u);
	assert.match(localSkill, /same old identity returns after memory should be gone/u);
	assert.match(localSkill, /logical ID, instance ID/u);
	assert.match(localSkill, /`active` and `finished` as selectors over one lifecycle model/u);
	assert.match(localSkill, /pending finish, submit, close, delete, or archive commands/u);
	assert.match(localSkill, /command ID or idempotency key/u);
	assert.match(localSkill, /Snapshot restore is not truth/u);
	assert.match(localSkill, /active, finished, and pending tests/u);
	assert.match(localSkill, /gateway as a connection and envelope owner/u);
	assert.match(localSkill, /event handler validate, deduplicate, order, and translate/u);
	assert.match(localSkill, /state store as the only in-memory truth/u);
	assert.match(localSkill, /persistence writer own event log, snapshots, high-watermark/u);
	assert.match(localSkill, /hydration guard buffer live events/u);
	assert.match(localSkill, /cleanup dispose the runtime generation/u);
	assert.match(localSkill, /`message\.complete` ends the message lifecycle only/u);
	assert.match(localSkill, /`terminal-error` changes terminal and session health/u);
	assert.match(localSkill, /`completedWithTerminalError`/u);
	assert.match(localSkill, /stale old-generation event rejection/u);
	assert.match(localSkill, /old-generation events arriving after restart/u);
	assert.match(skillIndex, /\.mustflow\/skills\/ui-state-resurrection-review\/SKILL\.md/u);
	assert.match(skillIndex, /closed, completed, cleared, deleted/u);
	assert.match(skillIndex, /active and finished stored as competing truths/u);
	assert.match(skillIndex, /active\/finished\/pending projection decision/u);
	assert.match(skillIndex, /message\.complete/u);
	assert.match(skillIndex, /remaining resurrection risk/u);
	assert.match(routes, /\[routes\."ui-state-resurrection-review"\]\r?\ncategory = "ui_assets"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 83/u);
	const expectedUiStateResurrectionReasons = [
		'unknown_change',
		'ui_change',
		'behavior_change',
		'code_change',
		'performance_change',
		'data_change',
		'test_change',
		'public_api_change',
		'docs_change',
		'package_metadata_change',
		'release_risk',
	];
	assert.match(
		routes,
		new RegExp(
			`applies_to_reasons = \\[${expectedUiStateResurrectionReasons
				.map((reason) => `"${reason}"`)
				.join(', ')}\\]`,
			'u',
		),
	);
	assert.match(manifest, /"\.mustflow\/skills\/ui-state-resurrection-review\/SKILL\.md"/u);
	assert.match(manifest, /"ui-state-resurrection-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.ui-state-resurrection-review"\][\s\S]*?revision = 3/u);
});

test('frontend stress layout review catches hostile content and container breakage', () => {
	const localSkill = readText('.mustflow/skills/frontend-stress-layout-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/frontend-stress-layout-review/SKILL.md',
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
	assert.match(localSkill, /stress fixture/u);
	assert.match(localSkill, /parent container/u);
	assert.match(localSkill, /container queries/u);
	assert.match(localSkill, /`min-width: 0`/u);
	assert.match(localSkill, /`minmax\(0, 1fr\)`/u);
	assert.match(localSkill, /`overflow-wrap: anywhere`/u);
	assert.match(localSkill, /`aspect-ratio`/u);
	assert.match(localSkill, /skeleton/u);
	assert.match(localSkill, /empty state/u);
	assert.match(localSkill, /permission/u);
	assert.match(localSkill, /`scrollbar-gutter: stable`/u);
	assert.match(localSkill, /`100vh`/u);
	assert.match(localSkill, /safe-area-inset/u);
	assert.match(localSkill, /line-height/u);
	assert.match(localSkill, /logical properties/u);
	assert.match(localSkill, /prefers-reduced-motion/u);
	assert.match(localSkill, /ResizeObserver/u);
	assert.match(localSkill, /portal/u);
	assert.match(localSkill, /z-index/u);
	assert.match(localSkill, /table/u);
	assert.match(localSkill, /chart/u);
	assert.match(localSkill, /browser zoom/u);
	assert.match(localSkill, /@layer/u);
	assert.match(localSkill, /reproducible break condition/u);
	assert.match(skillIndex, /\.mustflow\/skills\/frontend-stress-layout-review\/SKILL\.md/u);
	assert.match(skillIndex, /hostile-content and\s+layout-resilience review/u);
	assert.match(skillIndex, /vague non-reproducible visual complaint/u);
	assert.match(routes, /\[routes\."frontend-stress-layout-review"\]\r?\ncategory = "ui_assets"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 80/u);
	assertRouteReasonsText(routes, [
		'ui_change',
		'behavior_change',
		'code_change',
		'performance_change',
		'web_asset_change',
		'test_change',
		'docs_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/frontend-stress-layout-review\/SKILL\.md"/u);
	assert.match(manifest, /"frontend-stress-layout-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.frontend-stress-layout-review"\][\s\S]*?revision = 1/u);
});

test('frontend accessibility tree review catches semantic, keyboard, and name drift', () => {
	const localSkill = readText('.mustflow/skills/frontend-accessibility-tree-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/frontend-accessibility-tree-review/SKILL.md',
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
	assert.match(localSkill, /accessibility tree/u);
	assert.match(localSkill, /native HTML/u);
	assert.match(localSkill, /accessible name/u);
	assert.match(localSkill, /visible label/u);
	assert.match(localSkill, /Semantic ledger/u);
	assert.match(localSkill, /Keyboard ledger/u);
	assert.match(localSkill, /Assistive-technology ledger/u);
	assert.match(localSkill, /Form ledger/u);
	assert.match(localSkill, /`onClick`/u);
	assert.match(localSkill, /`role="button"`/u);
	assert.match(localSkill, /`href="#"`/u);
	assert.match(localSkill, /positive tabindex/u);
	assert.match(localSkill, /`:focus-visible`/u);
	assert.match(localSkill, /dialog needs a name, initial focus/u);
	assert.match(localSkill, /speech input users/u);
	assert.match(localSkill, /`aria-labelledby` and `aria-describedby`/u);
	assert.match(localSkill, /`aria-hidden="true"`/u);
	assert.match(localSkill, /SVG and icon defaults/u);
	assert.match(localSkill, /image alt/u);
	assert.match(localSkill, /Placeholder is not a label/u);
	assert.match(localSkill, /fieldset` and `legend/u);
	assert.match(localSkill, /`aria-invalid`/u);
	assert.match(localSkill, /live region/u);
	assert.match(localSkill, /Menus, menu buttons, tabs, comboboxes/u);
	assert.match(localSkill, /custom select/u);
	assert.match(localSkill, /non-text contrast/u);
	assert.match(localSkill, /target size/u);
	assert.match(localSkill, /drag-only/u);
	assert.match(localSkill, /axe/u);
	assert.match(localSkill, /Playwright accessibility snapshots/u);
	assert.match(skillIndex, /\.mustflow\/skills\/frontend-accessibility-tree-review\/SKILL\.md/u);
	assert.match(skillIndex, /browser accessibility tree/u);
	assert.match(skillIndex, /ARIA attributes exist/u);
	assert.match(routes, /\[routes\."frontend-accessibility-tree-review"\]\r?\ncategory = "ui_assets"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 82/u);
	assertRouteReasonsText(routes, [
		'ui_change',
		'behavior_change',
		'code_change',
		'test_change',
		'docs_change',
		'web_asset_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/frontend-accessibility-tree-review\/SKILL\.md"/u);
	assert.match(manifest, /"frontend-accessibility-tree-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.frontend-accessibility-tree-review"\][\s\S]*?revision = 1/u);
});

test('frontend localization review catches hidden strings, locale formatting, and export drift', () => {
	const localSkill = readText('.mustflow/skills/frontend-localization-review/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/frontend-localization-review/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /String exposure ledger/u);
	assert.match(localSkill, /visible JSX text/u);
	assert.match(localSkill, /`placeholder`/u);
	assert.match(localSkill, /`aria-label`/u);
	assert.match(localSkill, /Open Graph/u);
	assert.match(localSkill, /SVG `<text>`/u);
	assert.match(localSkill, /canvas text/u);
	assert.match(localSkill, /CSV headers/u);
	assert.match(localSkill, /full-sentence/u);
	assert.match(localSkill, /named interpolation/u);
	assert.match(localSkill, /`t\('hello'\) \+ name \+ t\('welcome'\)`/u);
	assert.match(localSkill, /`Delete \{item\}`/u);
	assert.match(localSkill, /ICU plural/u);
	assert.match(localSkill, /zero-result/u);
	assert.match(localSkill, /Korean particles/u);
	assert.match(localSkill, /tone and formality/u);
	assert.match(localSkill, /`new Date\(\)`/u);
	assert.match(localSkill, /currency/u);
	assert.match(localSkill, /`Number\(input\)`/u);
	assert.match(localSkill, /language, region, currency, time zone, and measurement unit/u);
	assert.match(localSkill, /default `sort\(\)`/u);
	assert.match(localSkill, /plain `toLowerCase\(\)`/u);
	assert.match(localSkill, /Unicode normalization/u);
	assert.match(localSkill, /grapheme-safe/u);
	assert.match(localSkill, /RTL and bidirectional/u);
	assert.match(localSkill, /`dir="auto"`/u);
	assert.match(localSkill, /font fallback/u);
	assert.match(localSkill, /pseudo localization/u);
	assert.match(localSkill, /SSR and hydration locale agreement/u);
	assert.match(localSkill, /silent English fallback/u);
	assert.match(localSkill, /raw backend prose/u);
	assert.match(localSkill, /export, share, and notification surfaces/u);
	assert.match(skillIndex, /\.mustflow\/skills\/frontend-localization-review\/SKILL\.md/u);
	assert.match(skillIndex, /all\s+user-visible strings/u);
	assert.match(skillIndex, /visible JSX text scan/u);
	assert.match(routes, /\[routes\."frontend-localization-review"\]\r?\ncategory = "ui_assets"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 84/u);
	assertRouteReasonsText(routes, [
		'ui_change',
		'behavior_change',
		'code_change',
		'test_change',
		'docs_change',
		'i18n_change',
		'web_asset_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/frontend-localization-review\/SKILL\.md"/u);
	assert.match(manifest, /"frontend-localization-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.frontend-localization-review"\][\s\S]*?revision = 2/u);
});

test('frontend component library review treats design systems as public API platforms', () => {
	const localSkill = readText('.mustflow/skills/frontend-component-library-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/frontend-component-library-review/SKILL.md',
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
	assert.match(localSkill, /public API platforms/u);
	assert.match(localSkill, /Package API ledger/u);
	assert.match(localSkill, /Token ledger/u);
	assert.match(localSkill, /Primitive behavior ledger/u);
	assert.match(localSkill, /Component contract ledger/u);
	assert.match(localSkill, /State contract ledger/u);
	assert.match(localSkill, /Variant and theming ledger/u);
	assert.match(localSkill, /Docs and test ledger/u);
	assert.match(localSkill, /Release ledger/u);
	assert.match(localSkill, /undocumented deep imports/u);
	assert.match(localSkill, /primitive tokens/u);
	assert.match(localSkill, /semantic tokens/u);
	assert.match(localSkill, /CSS variable/u);
	assert.match(localSkill, /theme.mode/u);
	assert.match(localSkill, /primitive behavior/u);
	assert.match(localSkill, /accessibility as public API/u);
	assert.match(localSkill, /controlled and uncontrolled/u);
	assert.match(localSkill, /polymorphic `as` or `asChild`/u);
	assert.match(localSkill, /Storybook or docs should show anatomy/u);
	assert.match(localSkill, /Type and export tests/u);
	assert.match(localSkill, /Visual regression/u);
	assert.match(localSkill, /Classify breaking changes broadly/u);
	assert.match(localSkill, /migration notes and codemods/u);
	assert.match(skillIndex, /\.mustflow\/skills\/frontend-component-library-review\/SKILL\.md/u);
	assert.match(skillIndex, /public API platform review/u);
	assert.match(skillIndex, /pretty-button pile/u);
	assert.match(routes, /\[routes\."frontend-component-library-review"\]\r?\ncategory = "ui_assets"\r?\nroute_type = "adjunct"\r?\npriority = 84/u);
	assert.deepEqual(routeReasons(routes, 'frontend-component-library-review'), [
		'ui_change',
		'behavior_change',
		'code_change',
		'test_change',
		'docs_change',
		'public_api_change',
		'package_metadata_change',
		'performance_change',
		'security_change',
		'privacy_change',
		'web_asset_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/frontend-component-library-review\/SKILL\.md"/u);
	for (const profileName of ['minimal', 'patterns', 'oss', 'team', 'product', 'library']) {
		const profileMatch = new RegExp(`${profileName} = \\[([\\s\\S]*?)\\]`, 'u').exec(manifest);
		assert.ok(profileMatch, `missing ${profileName} profile`);
		assert.match(profileMatch[1], /"frontend-component-library-review"/u);
	}
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.frontend-component-library-review"\][\s\S]*?revision = 1/u);
});

test('website task friction review catches common public website complaint traps', () => {
	const localSkill = readText('.mustflow/skills/website-task-friction-review/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/website-task-friction-review/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /primary visitor task/u);
	assert.match(localSkill, /public website/u);
	assert.match(localSkill, /landing page/u);
	assert.match(localSkill, /checkout flow/u);
	assert.match(localSkill, /support page/u);
	assert.match(localSkill, /cookie or consent surface/u);
	assert.match(localSkill, /first-task-blocking newsletter modals/u);
	assert.match(localSkill, /force account creation/u);
	assert.match(localSkill, /total price, taxes, shipping, fees/u);
	assert.match(localSkill, /Labels should match user vocabulary/u);
	assert.match(localSkill, /no-results/u);
	assert.match(localSkill, /small screens without zooming, hover, tiny targets/u);
	assert.match(localSkill, /Every field must earn its place/u);
	assert.match(localSkill, /preserved entered data/u);
	assert.match(localSkill, /developer-centered messages/u);
	assert.match(localSkill, /operator identity, contact, support/u);
	assert.match(localSkill, /Keyboard-only users/u);
	assert.match(localSkill, /Core Web Vitals/u);
	assert.match(localSkill, /dark patterns/u);
	assert.match(localSkill, /hidden opt-outs, fake urgency/u);
	assert.match(localSkill, /narrower skill/u);
	assert.match(skillIndex, /\.mustflow\/skills\/website-task-friction-review\/SKILL\.md/u);
	assert.match(skillIndex, /hidden costs, vague errors, dark patterns/u);
	assert.match(routes, /\[routes\."website-task-friction-review"\]\r?\ncategory = "ui_assets"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 83/u);
	assertRouteReasonsText(routes, [
		'ui_change',
		'behavior_change',
		'code_change',
		'test_change',
		'docs_change',
		'performance_change',
		'security_change',
		'privacy_change',
		'public_api_change',
		'web_asset_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/website-task-friction-review\/SKILL\.md"/u);
	assert.match(manifest, /"website-task-friction-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.website-task-friction-review"\][\s\S]*?revision = 1/u);
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
	assert.match(tailwindSkill, /`@source inline\(\)`/u);
	assert.match(tailwindSkill, /`@source not inline\(\)`/u);
	assert.match(tailwindSkill, /path `@source not`/u);
	assert.match(tailwindSkill, /Safari 16\.4, Chrome 111, or Firefox 128/u);
	assert.match(tailwindSkill, /`source\(none\)`/u);
	assert.match(tailwindSkill, /`@reference`/u);
	assert.match(tailwindSkill, /`space-\*`/u);
	assert.match(tailwindSkill, /`dvh`, `svh`, or `lvh`/u);

	assert.match(unocssSkill, /Wind4 migration/u);
	assert.match(unocssSkill, /`fontFamily` -> `font`/u);
	assert.match(unocssSkill, /`container\.maxWidth` -> `containers\.maxWidth`/u);
	assert.match(unocssSkill, /`presetRemToPx`/u);
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
	assert.match(cssSkill, /Debug cascade before selector strength/u);
	assert.match(cssSkill, /unlayered legacy CSS would silently beat it/u);
	assert.match(cssSkill, /`!important` reverses layer priority/u);
	assert.match(cssSkill, /Use `flex: 1 1 0` plus `min-width: 0`/u);
	assert.match(cssSkill, /Use `minmax\(0, 1fr\)`/u);
	assert.match(cssSkill, /container queries style descendants, not the queried container itself/u);
	assert.match(cssSkill, /Check containing blocks and stacking contexts before increasing z-index/u);
	assert.match(cssSkill, /Avoid `body:has\(\.\.\.\)`, `:root:has\(\.\.\.\)`, or `\*:has\(\.\.\.\)`/u);
	assert.match(cssSkill, /Keep the token graph layered as palette or raw values, semantic role tokens, then component tokens/u);
	assert.match(cssSkill, /Do not encode `light` or `dark` into the core token name/u);
	assert.match(cssSkill, /Treat `prefers-color-scheme` as the system default only/u);
	assert.match(cssSkill, /Treat `forced-colors` and high-contrast modes as separate accessibility modes/u);
	assert.match(cssSkill, /Review contrast as foreground\/background pairs/u);
	assert.match(cssSkill, /Do not use `transition: all`/u);
	assert.match(cssSkill, /Keep `will-change` narrow, temporary, and evidence-backed/u);

	assert.match(htmlSkill, /popovers/u);
	assert.match(htmlSkill, /native constraint validation/u);
	assert.match(htmlSkill, /`inputmode`/u);
	assert.match(htmlSkill, /`enterkeyhint`/u);
	assert.match(htmlSkill, /inert background/u);
	assert.match(htmlSkill, /semantic HTML as a machine-readable contract/u);
	assert.match(htmlSkill, /Use `section` only for a thematic group/u);
	assert.match(htmlSkill, /Use `article` only for self-contained content/u);
	assert.match(htmlSkill, /Use `nav` only for major navigation/u);
	assert.match(htmlSkill, /one active visible `main` region/u);
	assert.match(htmlSkill, /heading elements as content outline/u);
	assert.match(htmlSkill, /Keep interactive elements out of labels/u);
	assert.match(htmlSkill, /Use `time` with a machine-readable `datetime`/u);
	assert.match(htmlSkill, /Use `figure` and `figcaption` only for self-contained referenced media/u);
	assert.match(htmlSkill, /Use real tables for tabular data/u);
	assert.match(htmlSkill, /For responsive image markup, verify `width`, `height`, `srcset`, `sizes`, `picture` art direction/u);

	assertI18nSkillDocument(i18n, 'tailwind-code-change', 4);
	assertI18nSkillDocument(i18n, 'unocss-code-change', 4);
	assertI18nSkillDocument(i18n, 'css-code-change', 4);
	assertI18nSkillDocument(i18n, 'html-code-change', 4);
});

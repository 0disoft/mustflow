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

test('TypeScript and dependency freshness skills distinguish TS6 API, TS7 RC, and nightly tracks', () => {
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
	assert.match(tsSkill, /TypeScript 7 RC comparison/u);
	assert.match(tsSkill, /TypeScript 7 nightly comparison/u);
	assert.match(tsSkill, /`@typescript\/typescript6`/u);
	assert.match(tsSkill, /`typescript@rc`/u);
	assert.match(tsSkill, /`@typescript\/native-preview`/u);
	assert.match(tsSkill, /`tsgo`/u);
	assert.match(tsSkill, /prefer `\.ts` source plus package `"type": "module"`/u);
	assert.match(tsSkill, /`moduleResolution` set to `NodeNext`/u);
	assert.match(tsSkill, /using the emitted runtime specifier, usually `\.js`/u);
	assert.match(tsSkill, /Use `moduleResolution: "Bundler"` only when a bundler/u);
	assert.match(tsSkill, /project references, monorepo package boundaries, type-check speed/u);
	assert.match(tsSkill, /Separate DTOs, persistence rows, provider payloads, and internal domain types/u);
	assert.match(tsSkill, /Use generics only to preserve a real relationship/u);
	assert.match(tsSkill, /Use function-property syntax for callback members/u);
	assert.match(tsSkill, /root `tsconfig` is a solution file with `files: \[\]`/u);
	assert.match(tsSkill, /Do not assume one `\.d\.ts` safely describes both `\.mjs` and `\.cjs`/u);
	assert.match(tsSkill, /Fake generic parsers such as `parseJson<T>\(\)`/u);
	assert.match(tsSkill, /`repo\/config-chain`, `code\/dependency-graph`, `code\/import-cycle`/u);
	assert.match(tsSkill, /`ignoreDeprecations` is a temporary compatibility valve/u);
	assert.match(tsSkill, /`--stableTypeOrdering` as a migration comparison tool/u);
	assert.match(tsSkill, /Keep the repository's existing `tsc`, `tsc6`, or framework typecheck as the compatibility baseline/u);
	assert.match(tsSkill, /compiler API consumers, language-service plugins, custom transformers/u);

	assert.match(dependencySkill, /TypeScript compiler tracks/u);
	assert.match(dependencySkill, /TS6 stable API track through `@typescript\/typescript6` and `tsc6`/u);
	assert.match(dependencySkill, /TS7 RC compiler track through `typescript@rc` and `tsc`/u);
	assert.match(dependencySkill, /TS7 nightly track through `@typescript\/native-preview` and `tsgo`/u);
	assert.match(dependencySkill, /Do not treat a nightly package as a stable replacement/u);
	assert.match(dependencySkill, /Keep compiler API, transformer, ESLint, language-service plugin/u);
	assert.match(dependencySkill, /lockfile-only or transitive vulnerability alerts/u);
	assert.match(dependencySkill, /old vulnerable version is absent from the resolved graph/u);

	assert.match(freshnessSkill, /TypeScript compiler-track references/u);
	assert.match(freshnessSkill, /Do not call RC or nightly output "latest stable TypeScript"/u);
	assert.match(freshnessSkill, /TS6 API compatibility, TS7 RC compiler verification, TS7 nightly comparison/u);
	assert.match(freshnessSkill, /TypeScript 6 stable API, TypeScript 7 RC compiler, TypeScript 7 nightly/u);

	assert.match(skillIndex, /TypeScript 6-to-7 migration surfaces/u);
	assert.match(skillIndex, /project references, type-check performance/u);
	assert.match(skillIndex, /DTO\/domain drift/u);
	assert.match(skillIndex, /type-graph bloat/u);
	assert.match(skillIndex, /TS7 RC over-adoption/u);
	assert.match(skillIndex, /TypeScript RC\/nightly\/API-track confusion/u);
	const typeScriptRouteReasons = [
		'"code_change"',
		'"behavior_change"',
		'"public_api_change"',
		'"test_change"',
		'"data_change"',
		'"migration_change"',
		'"ui_change"',
		'"performance_change"',
		'"package_metadata_change"',
		'"release_risk"',
	].join(', ');
	assert.match(
		routes,
		new RegExp(
			[
				String.raw`\[routes\."typescript-code-change"\]`,
				'category = "general_code"',
				'route_type = "primary"',
				'priority = 85',
				`applies_to_reasons = \\[${typeScriptRouteReasons}\\]`,
			].join(String.raw`\r?\n`),
			'u',
		),
	);
	assert.match(i18n, /\[documents\."skill\.typescript-code-change"\][\s\S]*?revision = 7/u);
	assert.match(i18n, /\[documents\."skill\.dependency-upgrade-review"\][\s\S]*?revision = 6/u);
	assert.match(i18n, /\[documents\."skill\.version-freshness-check"\][\s\S]*?revision = 10/u);
});

test('React code change skill keeps modern React contribution boundaries explicit', () => {
	const localSkill = readText('.mustflow/skills/react-code-change/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/react-code-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);

	assert.match(localSkill, /React 19 or React 19\.2 APIs/u);
	assert.match(localSkill, /Do not introduce Create React App/u);
	assert.match(localSkill, /React Compiler/u);
	assert.match(localSkill, /Render performance evidence/u);
	assert.match(localSkill, /compiler-powered `eslint-plugin-react-hooks`/u);
	assert.match(localSkill, /Do not blanket-add `memo`, `useMemo`, or `useCallback`/u);
	assert.match(localSkill, /Do not blanket-remove existing memoization/u);
	assert.match(localSkill, /Use Effects for synchronization with external systems/u);
	assert.match(localSkill, /Do not silence `react-hooks\/exhaustive-deps`/u);
	assert.match(localSkill, /`useEffectEvent` for that event-like logic only/u);
	assert.match(localSkill, /`useSyncExternalStore`/u);
	assert.match(localSkill, /React 19 ref-as-prop/u);
	assert.match(localSkill, /callback-ref cleanup/u);
	assert.match(localSkill, /`useImperativeHandle`/u);
	assert.match(localSkill, /`startTransition` or `useTransition`/u);
	assert.match(localSkill, /Do not expect Suspense to catch ordinary Effect fetches/u);
	assert.match(localSkill, /Treat `use` as render-time Promise or context reading/u);
	assert.match(localSkill, /`useActionState`, `useFormStatus`, `useOptimistic`, `<form action>`/u);
	assert.match(localSkill, /Review React render hot paths with evidence/u);
	assert.match(localSkill, /React DevTools Profiler/u);
	assert.match(localSkill, /state is owned too high/u);
	assert.match(localSkill, /unstable props/u);
	assert.match(localSkill, /render-time `filter`, `sort`, `map`/u);
	assert.match(localSkill, /virtualization/u);
	assert.match(localSkill, /`Math\.random\(\)`/u);
	assert.match(localSkill, /oversized context/u);
	assert.match(localSkill, /`useEffect` plus `setState`/u);
	assert.match(localSkill, /`useDeferredValue`, `useTransition`/u);
	assert.match(localSkill, /layout thrashing/u);
	assert.match(localSkill, /`content-visibility`/u);
	assert.match(localSkill, /Treat `<Activity>` as hidden UI with preserved state/u);
	assert.match(localSkill, /React Performance Tracks/u);
	assert.match(localSkill, /Distinguish Server Components from Server Actions/u);
	assert.match(localSkill, /`"use server"` marks\s+server functions or modules for actions/u);
	assert.match(localSkill, /`cacheSignal`/u);
	assert.match(localSkill, /Partial Pre-rendering/u);
	assert.match(localSkill, /do not assume Web Streams are faster than Node\s+streams/u);
	assert.match(localSkill, /Metadata, stylesheets with `precedence`, async scripts, `preinit`/u);
	assert.match(localSkill, /official React docs describe React 19\.2 as the current\s+feature line/u);
	assert.match(localSkill, /`v19\.2\.7` released on\s+2026-06-01/u);

	assert.match(skillIndex, /Use `react-code-change` as a primary route/u);
	assert.match(skillIndex, /\.mustflow\/skills\/react-code-change\/SKILL\.md/u);
	assert.match(
		routes,
		/\[routes\."react-code-change"\]\r?\ncategory = "ui_assets"\r?\nroute_type = "primary"\r?\npriority = 85/u,
	);
	for (const reason of ['ui_change', 'code_change', 'behavior_change', 'performance_change', 'release_risk']) {
		assert.ok(routeReasons(routes, 'react-code-change').includes(reason), `missing route reason ${reason}`);
	}
	assert.match(manifest, /"\.mustflow\/skills\/react-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"react-code-change"/u);
	assert.match(i18n, /\[documents\."skill\.react-code-change"\][\s\S]*?revision = 2/u);
});

test('Vue code change skill catches reactivity, component API, and hydration traps', () => {
	const localSkill = readText('.mustflow/skills/vue-code-change/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/vue-code-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);

	assert.match(localSkill, /Vue 3\.5\+ or Nuxt 4\.x features/u);
	assert.match(localSkill, /Do not assume Vite type-checks Vue SFCs/u);
	assert.match(localSkill, /Review reactivity by subscription width/u);
	assert.match(localSkill, /large API responses, large tables, log arrays/u);
	assert.match(localSkill, /Do not stringify, spread, or debug-print huge reactive objects/u);
	assert.match(localSkill, /Keep raw and proxy identities from mixing/u);
	assert.match(localSkill, /Keep computed getters pure/u);
	assert.match(localSkill, /Avoid `deep: true` as a default/u);
	assert.match(localSkill, /In async `watchEffect`, read dependencies before the first `await`/u);
	assert.match(localSkill, /Add cleanup for watcher fetches/u);
	assert.match(localSkill, /reactive props destructure/u);
	assert.match(localSkill, /`defineModel\(\{ default \}\)`/u);
	assert.match(localSkill, /Declare public emits/u);
	assert.match(localSkill, /Treat `\$attrs` as public API routing/u);
	assert.match(localSkill, /Treat slot names and slot props as public APIs/u);
	assert.match(localSkill, /Do not combine `v-if` and `v-for`/u);
	assert.match(localSkill, /Use `storeToRefs\(\)`/u);
	assert.match(localSkill, /Watch specific route params, query fields, or names/u);
	assert.match(localSkill, /Do not store request-specific state in module-scope singletons/u);
	assert.match(localSkill, /Use `data-allow-mismatch` only for narrowly intentional mismatches/u);
	assert.match(localSkill, /Do not use `<ClientOnly>` as a default mismatch fix/u);
	assert.match(localSkill, /Distinguish lazy code loading from lazy hydration/u);
	assert.match(localSkill, /Do not use `hydrate-never` on interactive components/u);
	assert.match(localSkill, /missing Vue SFC typecheck/u);

	assert.match(skillIndex, /Use `vue-code-change` as a primary route/u);
	assert.match(skillIndex, /\.mustflow\/skills\/vue-code-change\/SKILL\.md/u);
	assert.match(
		routes,
		/\[routes\."vue-code-change"\]\r?\ncategory = "ui_assets"\r?\nroute_type = "primary"\r?\npriority = 85/u,
	);
	for (const reason of ['ui_change', 'code_change', 'behavior_change', 'performance_change', 'release_risk']) {
		assert.ok(routeReasons(routes, 'vue-code-change').includes(reason), `missing route reason ${reason}`);
	}
	assert.match(manifest, /"\.mustflow\/skills\/vue-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"vue-code-change"/u);
	assert.match(i18n, /\[documents\."skill\.vue-code-change"\][\s\S]*?revision = 1/u);
});

test('Vite code change skill catches toolchain, plugin, optimizer, and output traps', () => {
	const localSkill = readText('.mustflow/skills/vite-code-change/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/vite-code-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);

	assert.match(localSkill, /Do not treat this skill as a live Vite version source/u);
	assert.match(localSkill, /Refresh official Vite docs, release notes, migration docs/u);
	assert.match(localSkill, /Keep Vite 7 transition-package guidance, Vite 8 Rolldown defaults/u);
	assert.match(localSkill, /Review Rolldown, Rollup, Oxc, and CSS compatibility/u);
	assert.match(localSkill, /old `build\.rollupOptions`, `worker\.rollupOptions`, `build\.commonjsOptions`/u);
	assert.match(localSkill, /Do not assume Vite type-checks TypeScript/u);
	assert.match(localSkill, /dependency optimizer include or exclude settings/u);
	assert.match(localSkill, /Keep HMR accept boundaries statically discoverable/u);
	assert.match(localSkill, /alias runs before user `enforce: 'pre'`/u);
	assert.match(localSkill, /user `enforce: 'post'` is not the\s+final build output/u);
	assert.match(localSkill, /query suffixes such as raw, url, worker, and inline remain meaningful/u);
	assert.match(localSkill, /Key plugin caches by environment/u);
	assert.match(localSkill, /Build a package-entry ledger for client, dev SSR, production SSR/u);
	assert.match(localSkill, /The SSR manifest is\s+a client-build artifact/u);
	assert.match(localSkill, /Treat library mode as package output, not an app build/u);
	assert.match(localSkill, /Do not assume dynamic `new URL\(dynamicPath, import\.meta\.url\)` is transformed/u);
	assert.match(localSkill, /Do not silence chunk-size warnings by only raising the limit/u);
	assert.match(localSkill, /Do not publish source maps by accident/u);
	assert.match(localSkill, /Preserve the repository's package manager and lockfile/u);
	assert.match(localSkill, /Do not set `allowedHosts: true` as a shortcut/u);

	assert.match(skillIndex, /Use `vite-code-change` as a primary route/u);
	assert.match(skillIndex, /\.mustflow\/skills\/vite-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /stale Vite version claim/u);
	assert.match(skillIndex, /old Rollup\/esbuild option drift/u);
	assert.match(
		routes,
		/\[routes\."vite-code-change"\]\r?\ncategory = "ui_assets"\r?\nroute_type = "primary"\r?\npriority = 85/u,
	);
	for (const reason of ['ui_change', 'code_change', 'performance_change', 'docs_change', 'migration_change', 'release_risk']) {
		assert.ok(routeReasons(routes, 'vite-code-change').includes(reason), `missing route reason ${reason}`);
	}
	assert.match(manifest, /"\.mustflow\/skills\/vite-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"vite-code-change"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.vite-code-change"\][\s\S]*?revision = 1/u);
});

test('Babylon code change skill keeps engine, asset, material, physics, and lifecycle risks explicit', () => {
	const localSkill = readText('.mustflow/skills/babylon-code-change/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/babylon-code-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);

	assert.match(localSkill, /WebGPU or WebGL engine setup/u);
	assert.match(localSkill, /Treat WebGPU initialization as asynchronous/u);
	assert.match(localSkill, /Preserve WebGL fallback/u);
	assert.match(localSkill, /Babylon non compatibility mode/u);
	assert.match(localSkill, /Make render-loop registration idempotent/u);
	assert.match(localSkill, /`mesh\.dispose\(\)` alone\s+rarely proves memory cleanup/u);
	assert.match(localSkill, /Use `TransformNode` for non-rendering parents/u);
	assert.match(localSkill, /clustered lighting as a way to reduce light evaluation cost/u);
	assert.match(localSkill, /Do not use full PBR, clear coat, glass, subsurface/u);
	assert.match(localSkill, /PNG, JPG, and WebP as transfer formats/u);
	assert.match(localSkill, /Choose KTX2 modes by texture class/u);
	assert.match(localSkill, /Avoid runtime material define churn/u);
	assert.match(localSkill, /WebGPU custom shaders/u);
	assert.match(localSkill, /Prefer `LoadAssetContainerAsync`/u);
	assert.match(localSkill, /Do not treat `loadedMeshes\[0\]` as the first visual mesh/u);
	assert.match(localSkill, /Draco, Meshopt, KTX2, and progressive GLB as runtime contracts/u);
	assert.match(localSkill, /Build thin-instance buffers in bulk/u);
	assert.match(localSkill, /Keep thin-instance roots spatially chunked/u);
	assert.match(localSkill, /Disable pointer move picking/u);
	assert.match(localSkill, /Use Physics V2 concepts/u);
	assert.match(localSkill, /Reserve mesh shapes for\s+static terrain/u);
	assert.match(localSkill, /collision callbacks lightweight and filtered/u);

	assert.match(skillIndex, /Use `babylon-code-change` as a primary route/u);
	assert.match(skillIndex, /\.mustflow\/skills\/babylon-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /Babylon.js, WebGPU or WebGL engine setup/u);
	assert.match(
		routes,
		/\[routes\."babylon-code-change"\]\r?\ncategory = "ui_assets"\r?\nroute_type = "primary"\r?\npriority = 85/u,
	);
	for (const reason of ['ui_change', 'code_change', 'performance_change', 'docs_change', 'migration_change', 'release_risk']) {
		assert.ok(routeReasons(routes, 'babylon-code-change').includes(reason), `missing route reason ${reason}`);
	}
	assert.match(manifest, /"\.mustflow\/skills\/babylon-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"babylon-code-change"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.babylon-code-change"\][\s\S]*?revision = 1/u);
});

test('Svelte code change skill catches SvelteKit execution modes and runes traps', () => {
	const localSkill = readText('.mustflow/skills/svelte-code-change/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/svelte-code-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);

	assert.match(localSkill, /universal or server load functions, form actions, endpoints, hooks/u);
	assert.match(localSkill, /Refresh official package or vendor sources before preserving exact "latest"/u);
	assert.match(localSkill, /Treat `\+page\.ts` and `\+layout\.ts` as universal/u);
	assert.match(localSkill, /server-load data is intentionally passed through the universal `load` return value/u);
	assert.match(localSkill, /Keep `load` side-effect-free/u);
	assert.match(localSkill, /Avoid `await parent\(\)` waterfalls/u);
	assert.match(localSkill, /Use SvelteKit-provided `fetch` inside load/u);
	assert.match(localSkill, /register `depends\(\.\.\.\)` keys and invalidate the exact URL/u);
	assert.match(localSkill, /Preserve `fail\(\.\.\.\)`, `redirect\(303, \.\.\.\)`, `use:enhance`/u);
	assert.match(localSkill, /For streaming load data, finish auth, redirects, and headers before streaming starts/u);
	assert.match(localSkill, /Preserve hydration markers and valid HTML structure/u);
	assert.match(localSkill, /make route-dependent values `\$derived`/u);
	assert.match(localSkill, /Use `\$state` only for state that should update UI/u);
	assert.match(localSkill, /large immutable payloads, table rows, CMS payloads/u);
	assert.match(localSkill, /Do not destructure `\$state` or proxy objects when live reactivity is required/u);
	assert.match(localSkill, /Use `SvelteMap`, `SvelteSet`, `SvelteDate`, `SvelteURL`/u);
	assert.match(localSkill, /Keep `\$effect` dependencies narrow and synchronous/u);
	assert.match(localSkill, /Treat props as parent-owned/u);
	assert.match(localSkill, /Treat snippets as typed render callbacks/u);
	assert.match(localSkill, /Do not edit generated `\.svelte-kit` files as source/u);

	assert.match(skillIndex, /Use `svelte-code-change` as a primary route/u);
	assert.match(skillIndex, /\.mustflow\/skills\/svelte-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /route\/load\/action\/invalidation\/streaming/u);
	assert.match(
		routes,
		/\[routes\."svelte-code-change"\]\r?\ncategory = "ui_assets"\r?\nroute_type = "primary"\r?\npriority = 85/u,
	);
	for (const reason of ['performance_change', 'docs_change', 'migration_change', 'release_risk']) {
		assert.ok(routeReasons(routes, 'svelte-code-change').includes(reason), `missing route reason ${reason}`);
	}
	assert.match(manifest, /"\.mustflow\/skills\/svelte-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"svelte-code-change"/u);
	assert.match(i18n, /\[documents\."skill\.svelte-code-change"\][\s\S]*?revision = 3/u);
});

test('Elysia code change skill keeps schema, OpenAPI, Eden, lifecycle, and runtime risks explicit', () => {
	const localSkill = readText('.mustflow/skills/elysia-code-change/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/elysia-code-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);

	assert.match(localSkill, /schema-first runtime validation/u);
	assert.match(localSkill, /Standard Schema validators/u);
	assert.match(localSkill, /Refresh official package or vendor sources before preserving exact "latest" claims/u);
	assert.match(localSkill, /Eden uses `typeof app`; OpenAPI SDKs use the OpenAPI document/u);
	assert.match(localSkill, /params, query, and headers arrive as HTTP strings/u);
	assert.match(localSkill, /lower-case header schema keys/u);
	assert.match(localSkill, /distinguish `t\.Optional` around an input object/u);
	assert.match(localSkill, /For file uploads, distinguish `t\.File\(\)` behavior from Standard Schema file validation/u);
	assert.match(localSkill, /For webhook verifiers, tRPC, oRPC, proxy, or raw-body endpoints/u);
	assert.match(localSkill, /Reject GET or HEAD bodies as portable public API contracts/u);
	assert.match(localSkill, /Keep request-specific state out of module-level mutable globals, `\.store`, and `\.decorate`/u);
	assert.match(localSkill, /Check lifecycle scope and registration order/u);
	assert.match(localSkill, /Treat macros as public route-option APIs/u);
	assert.match(localSkill, /protect or intentionally expose `\/openapi`, `\/openapi\/json`/u);
	assert.match(localSkill, /do not treat `detail\.hide` as access control/u);
	assert.match(localSkill, /the official Elysia OpenAPI plugin and its docs UI provider are not the same thing/u);
	assert.match(localSkill, /`fromTypes\(\)` or type generation/u);
	assert.match(localSkill, /`withHeader\(\)` documents response headers; it does not enforce/u);
	assert.match(localSkill, /export `type App = typeof app`/u);
	assert.match(localSkill, /handle Treaty `error` before assuming `data` is non-null/u);
	assert.match(localSkill, /split public, admin, internal, WebSocket, and streaming surfaces/u);
	assert.match(localSkill, /static, dynamic, wildcard, optional, group, guard, prefix, mount, and `all\(\)` behavior/u);
	assert.match(localSkill, /idle timeout, WebSocket backpressure, clustering, compile targets, port binding, Docker build context, and observability/u);

	assert.match(skillIndex, /Elysia routes, schemas, Standard Schema validators/u);
	assert.match(skillIndex, /\.mustflow\/skills\/elysia-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /OpenAPI\/Eden, runtime\/deploy impact checked/u);
	assert.match(
		routes,
		/\[routes\."elysia-code-change"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"\r?\npriority = 85/u,
	);
	for (const reason of ['behavior_change', 'docs_change', 'performance_change', 'privacy_change', 'release_risk']) {
		assert.ok(routeReasons(routes, 'elysia-code-change').includes(reason), `missing route reason ${reason}`);
	}
	assert.match(manifest, /"\.mustflow\/skills\/elysia-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"elysia-code-change"/u);
	assert.match(i18n, /\[documents\."skill\.elysia-code-change"\][\s\S]*?revision = 3/u);
});

test('Hono code change skill keeps routing, validation, typed client, and adapter risks explicit', () => {
	const localSkill = readText('.mustflow/skills/hono-code-change/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/hono-code-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);

	assert.match(localSkill, /route chains, middleware order, validators, RPC or typed clients/u);
	assert.match(localSkill, /Refresh official package or vendor sources before preserving exact "latest"/u);
	assert.match(localSkill, /Treat Hono route order as behavior/u);
	assert.match(localSkill, /`route\(\)`, `basePath\(\)`, `mount`, optional params/u);
	assert.match(localSkill, /For CORS with credentials, require an explicit origin allowlist/u);
	assert.match(localSkill, /Separate `Bindings` from `Variables`/u);
	assert.match(localSkill, /Avoid `ContextVariableMap` unless the value is truly available for every request path/u);
	assert.match(localSkill, /Use `c\.req\.valid\(\.\.\.\)` output rather than rereading unvalidated request bodies/u);
	assert.match(localSkill, /header validator keys are lowercase/u);
	assert.match(localSkill, /`json` or `form` validators need the matching `Content-Type`/u);
	assert.match(localSkill, /multipart uploads, large JSON, webhooks, raw-body signatures/u);
	assert.match(localSkill, /exporting the route chain actually used by `hc<AppType>\(\)`/u);
	assert.match(localSkill, /typed `c\.json\(payload, status\)` paths/u);
	assert.match(localSkill, /Keep runtime validation schema, OpenAPI schema, response schema, generated SDKs, and Hono RPC types from becoming separate truths/u);
	assert.match(localSkill, /Do not put Node-only, Bun-only, Cloudflare-only, Deno-only, Lambda-only/u);
	assert.match(localSkill, /streaming, SSE, WebSocket, cache, ETag, static file, and SSR or JSX routes/u);
	assert.match(localSkill, /cache key and `Vary`, repeated `Set-Cookie`, and adapter header normalization/u);

	assert.match(skillIndex, /Hono apps, route chains, middleware order, validators, RPC or typed clients/u);
	assert.match(skillIndex, /\.mustflow\/skills\/hono-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /OpenAPI\/RPC\/SDK, streaming\/cache\/static/u);
	assert.match(
		routes,
		/\[routes\."hono-code-change"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"\r?\npriority = 85/u,
	);
	for (const reason of ['behavior_change', 'docs_change', 'performance_change', 'privacy_change', 'release_risk']) {
		assert.ok(routeReasons(routes, 'hono-code-change').includes(reason), `missing route reason ${reason}`);
	}
	assert.match(manifest, /"\.mustflow\/skills\/hono-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"hono-code-change"/u);
	assert.match(i18n, /\[documents\."skill\.hono-code-change"\][\s\S]*?revision = 2/u);
});

test('Axum code change skill keeps route, extractor, Tower, Tokio, and SQLx risks explicit', () => {
	const localSkill = readText('.mustflow/skills/axum-code-change/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/axum-code-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);

	assert.match(localSkill, /Axum routers, handlers, extractors, state/u);
	assert.match(localSkill, /Distinguish docs\.rs for the crate version in use from GitHub `main`/u);
	assert.match(localSkill, /Apply `rust-code-change` alongside this skill/u);
	assert.match(localSkill, /do not use `without_v07_checks\(\)` as a migration bypass/u);
	assert.match(localSkill, /route capture syntax such as `\/\{id\}` and `\/\{\*rest\}`/u);
	assert.match(localSkill, /`Router::layer` and `route_layer` apply to already registered routes/u);
	assert.match(localSkill, /URI rewrite or path normalization must happen before routing/u);
	assert.match(localSkill, /body-consuming extractors such as `Json`, `Bytes`, `String`, `Form`/u);
	assert.match(localSkill, /must be last and unique/u);
	assert.match(localSkill, /auth, tenant, request id, and header\/cookie-only extractors should use `FromRequestParts`/u);
	assert.match(localSkill, /use `State` for app-wide resources/u);
	assert.match(localSkill, /request extensions for current user, tenant, request id/u);
	assert.match(localSkill, /`Router<S>` means the router is still missing state `S`/u);
	assert.match(localSkill, /handler `Err` values are usually response values/u);
	assert.match(localSkill, /fallible Tower middleware errors with `HandleErrorLayer`/u);
	assert.match(localSkill, /distinguish `tower::timeout` error behavior from `tower_http::timeout` response behavior/u);
	assert.match(localSkill, /prefer `ServiceBuilder` when layer order is non-trivial/u);
	assert.match(localSkill, /mark sensitive request headers before trace logging/u);
	assert.match(localSkill, /do not treat CORS as authentication or authorization/u);
	assert.match(localSkill, /signed cookies are integrity-protected, not encrypted/u);
	assert.match(localSkill, /cookie jar changes must be returned with the response/u);
	assert.match(localSkill, /do not log raw `Authorization`, `Cookie`, `Set-Cookie`/u);
	assert.match(localSkill, /decide whether limits apply to wire size, decompressed size, JSON size/u);
	assert.match(localSkill, /do not hold locks, DB connections, transactions/u);
	assert.match(localSkill, /bound spawned work with a semaphore, bounded channel, worker queue/u);
	assert.match(localSkill, /do not wrap `Pool`, `PgPool`, `MySqlPool`, `SqlitePool`, reqwest `Client`/u);
	assert.match(localSkill, /release pool connections and transactions before external HTTP/u);

	assert.match(skillIndex, /Use `axum-code-change` as a primary route/u);
	assert.match(skillIndex, /\.mustflow\/skills\/axum-code-change\/SKILL\.md/u);
	assert.match(skillIndex, /Axum apps, routers, handlers, extractors, state, extensions/u);
	assert.match(
		routes,
		/\[routes\."axum-code-change"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"\r?\npriority = 85/u,
	);
	for (const reason of ['behavior_change', 'docs_change', 'performance_change', 'privacy_change', 'data_change', 'release_risk']) {
		assert.ok(routeReasons(routes, 'axum-code-change').includes(reason), `missing route reason ${reason}`);
	}
	assert.match(manifest, /"\.mustflow\/skills\/axum-code-change\/SKILL\.md"/u);
	assert.match(manifest, /"axum-code-change"/u);
	assert.match(i18n, /\[documents\."skill\.axum-code-change"\][\s\S]*?revision = 1/u);
});

---
mustflow_doc: skill.astro-code-change
locale: en
canonical: true
revision: 6
lifecycle: mustflow-owned
authority: procedure
name: astro-code-change
description: Apply this skill when Astro config, package metadata, pages, layouts, components, client islands, server islands, hydration directives, content or live collections, dynamic routes, endpoints, actions, adapters, request pipeline, advanced routing, route cache, MDX, Markdoc, Markdown processing, RSS, sitemap, canonical URL, draft, pagination, ClientRouter, migration, or build behavior are created or changed.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.astro-code-change
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - docs_validate_fast
    - mustflow_check
---

# Astro Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve Astro's HTML-first model, static-first default, island hydration boundary, server island boundary, routing contract, request pipeline, content collection schema, canonical URL, RSS, sitemap, adapter, cache, and client bundle boundaries.

The default is no-hydration. Add browser JavaScript only after proving that native HTML, CSS, standard links, forms, details/summary, or a small `.astro` script cannot provide the required behavior.

<!-- mustflow-section: use-when -->
## Use When

- `astro.config.*`, package metadata, `src/pages`, `src/fetch.*`, `.astro`, content config, live config, collections, layouts, components, MDX, Markdoc, Markdown processor config, routes, endpoints, actions, adapters, integrations, client islands, server islands, route cache, `ClientRouter`, or hydration directives change.
- The task adds or changes a page, blog/docs content, interactive UI, SSR/on-demand rendering, framework component, search/filter UI, request pipeline behavior, route behavior, RSS feed, sitemap, canonical URL, draft handling, migration, pagination, image handling, syntax highlighting, or client-side navigation.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The change is framework-agnostic CSS or HTML only; use `html-code-change` or `css-code-change`.
- The interactive component is entirely inside another framework and Astro routing/content is unaffected.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Package metadata, current Astro version, target Astro version when migration is intended, framework integrations, TypeScript config, pages, layouts, components, content config, content files, integrations, adapter config, env declarations, public assets, and tests.
- Astro config values that affect routing, URLs, rendering, request handling, Markdown, and cache: `site`, `base`, `trailingSlash`, `output`, `adapter`, `fetchFile`, `markdown`, `compressHTML`, `cache`, `routeRules`, sitemap integration, MDX integration, and framework integrations.
- Content collection names, loader bases, schemas, slug/id policy, draft fields, date fields, canonical fields, and route files that turn collection entries into pages.
- Current output mode, prerender/SSR policy, hydration conventions, server island usage, route priority, endpoint layout, action usage, request pipeline or middleware layout, RSS generation, sitemap generation, and content schema.
- Markdown processor decision, MDX optimizer behavior, Markdoc `allowHTML` and tag validation, remark/rehype/recma plugins, custom Markdown imports, heading id policy, syntax-highlighting expectations, Shiki theme/language loading, and Markdown or MDX snapshots when content rendering changes.
- Cache provider, route cache rules, cache-key inputs, invalidation path, deployment topology, and authenticated or personalized routes when `cache` or `routeRules` change.
- Runtime target and preview path when adapters, server islands, actions, sessions, filesystem access, Node APIs, edge runtimes, or CDN HTML transforms are involved.
- Configured verification intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- Read Astro config, content config, and the affected route tree before changing routing, content, canonical, RSS, sitemap, or hydration behavior.
- Identify current and target Astro major versions before applying migration rules. Apply only the official major upgrade guide deltas crossed by the change, and keep ordinary Astro edits on the version-neutral policies below.
- Identify build-time versus request-time data before adding data access.
- Identify which UI truly needs browser JavaScript and which UI truly needs framework state before adding a framework island.
- Identify whether a dynamic value belongs in build-time content collections, live collections, on-demand routes, server islands, actions, endpoints, or client islands.
- Treat file movement under `src/pages`, route parameter changes, and content slug changes as URL contract changes.
- Treat `src/fetch.ts` and `src/fetch.js` as reserved advanced-routing entrypoint candidates unless `fetchFile` disables or moves that entrypoint.
- Treat `output: "hybrid"` as stale migration input. Current source must choose `output: "static"` with route-level `prerender = false`, or `output: "server"` with route-level `prerender = true` where appropriate.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Prefer static `.astro`, HTML, CSS, native links, native forms, details/summary, and small `.astro` scripts before adding a framework island.
- Use hydration directives only for components that need browser interactivity and cannot be handled with a small non-framework script.
- Keep content collection schemas synchronized with frontmatter and collection reads.
- Keep server-only secrets and data access out of client islands.
- Keep SEO-critical copy, primary page meaning, canonical metadata, and accessible fallback semantics in initial HTML rather than delayed islands.
- Keep adapter/runtime-specific APIs inside routes or adapters that can actually execute them.

<!-- mustflow-section: procedure -->
## Procedure

1. Read package metadata and Astro config first. Record current and target Astro versions, framework integrations, `site`, `base`, `trailingSlash`, `output`, adapter, `fetchFile`, `markdown`, `compressHTML`, `cache`, `routeRules`, sitemap integration, MDX integration, and any framework integration.
2. Apply the Version Gate before using migration guidance:
   - If the task is not changing the Astro major version, do not run stale major-specific deltas as routine review noise.
   - If the task crosses one or more Astro majors, check the official Astro upgrade guide for each crossed major and record which deltas apply.
   - If a version-specific claim cannot be refreshed from official Astro docs, omit it or report it as unchecked instead of writing it as current.
3. Read `src/content.config.*` when content, docs, blog, RSS, sitemap, canonical, or route generation is involved. Record each collection name, loader base, schema fields, slug/id policy, draft field, and date fields.
4. Build a route ledger from `src/pages`: static pages, dynamic pages, rest routes, endpoints, prerendered routes, on-demand routes, and possible route-priority collisions.
5. Classify the change: static route, dynamic route, endpoint, content collection, integration, adapter, SSR/on-demand, request pipeline, island, script, asset, RSS, sitemap, canonical, cache, Markdown, migration, or docs/content.
6. Apply the hydration policy below before adding or changing any `client:*` directive.
7. Apply the server island policy before using `server:defer`, adapter-backed delayed HTML, or personalized server-only fragments.
8. Apply the routing, rendering, endpoint, and action policies below before adding dynamic routes, catch-all routes, endpoints, actions, adapter changes, `src/fetch.*`, `output`, or `prerender` changes.
9. Apply the content, live collection, SEO, and feed policy below before changing frontmatter, schemas, slugs, drafts, canonical URLs, pagination, RSS, or sitemap behavior.
10. Apply the cache policy below before changing `cache`, `routeRules`, route-level cache behavior, server island cache headers, or cache provider configuration.
11. Apply the Markdown, Markdoc, Shiki, and compiler policy below before changing Markdown processing, MDX, Markdoc, generated markup, `compressHTML`, HTML snapshots, or whitespace-sensitive content.
12. Apply the adapter and runtime policy before relying on Node APIs, edge runtime features, server islands, sessions, actions, image services, or deployment preview behavior.
13. Do not put runtime-only data such as logged-in user state, request-local data, private API responses, live inventory, or request query state into build-time collections.
14. Do not enable request-time rendering without the adapter, cache, security, and deployment contract that support it.
15. Keep `set:html`, raw HTML, Markdoc `allowHTML`, or full-content RSS behind a trusted and sanitized content boundary.
16. Choose configured verification intents that cover content schema, build, routes, hydration, adapter/runtime, cache, Markdown, request pipeline, and bundle risk when available.

## Hydration Policy

- If HTML, CSS, standard links, native forms, details/summary, or static content can provide the feature, do not add hydration.
- If the behavior is a small browser enhancement such as copy, expand/collapse, theme class toggling, heading-anchor copying, analytics, or a small dropdown, prefer a `.astro` script or custom element over a framework island.
- Add a framework island only after the component needs framework state, lifecycle, or an existing framework component that cannot be replaced safely.
- Use `client:load` only for immediately visible controls that must be interactive as soon as the page loads.
- Use `client:idle` for non-critical above-fold or near-fold enhancements that may hydrate after initial load.
- Use `client:visible` for below-the-fold or heavy widgets that users may never view, and set a practical `rootMargin` when hydration would otherwise arrive after the user can interact.
- Use `client:media` only when the media query is also the interaction contract. Prefer `client:visible` when CSS already controls visibility.
- Treat `client:only` as a last-resort exception. It requires an SSR-impossible browser-only dependency or API and a named reason.
- Do not use framework islands for ordinary links, breadcrumbs, tag lists, card lists, static tables of contents, prose callouts, pagination, or static search links.
- Do not place `client:load` on page shells, layouts, broad sections, or framework components whose static children dominate the UI.
- Do not pass large CMS payloads, product lists, search results, or service responses as island props; they inflate HTML before JavaScript cost is visible.
- When using multiple UI frameworks, separate renderer boundaries with explicit include/exclude paths and avoid mixing React, Preact, Solid, Vue, Svelte, or other runtimes on one page unless migration or team ownership justifies it.
- If islands share fast-changing state through globals, storage, custom events, or stores, either name the coordination contract or merge the UI into one island.
- Treat `is:inline` and `define:vars` in repeated components as duplication risks because they can bypass script bundling and deduplication.
- When adding a hydration directive, report the reason and the expected client bundle or island-count impact when verifiable.

## Server Island Policy

- Use `server:defer` for delayed server-rendered fragments whose absence does not break the first page meaning, such as account chrome, personalization, small recommendations, or region-specific secondary data.
- Keep SEO-critical copy, product facts, article bodies, primary CTAs, FAQ text, and core page meaning in static or SSR initial HTML.
- Treat the fallback slot as real first-view UI. Reserve dimensions, preserve accessible names or status semantics, and avoid layout shift when the server island replaces it.
- Pass small serializable identifiers and options to server islands. Do not pass callbacks, circular objects, broad service responses, or large objects that force POST fallback and lose browser cacheability.
- Pin `ASTRO_KEY` or equivalent deployment secret when cached HTML, rolling deployments, multi-region deploys, or CDN HTML reuse can outlive the build that encrypted server island props.
- Do not read the user-facing page URL from `Astro.url` inside a server island. Pass needed page state as props, or use referer-derived logic only when the privacy and cache boundary is explicit.
- Do not cache personalized server island HTML publicly. Use `private`, `no-store`, or an explicit user-varying cache key for authenticated, cookie-derived, account, price-tier, or permission-dependent fragments.
- Do not expect a server island to re-render itself after client state changes. Use a client island with actions or endpoints for frequent post-interaction updates.
- Avoid stacking delayed shells: combining `server:defer` with `client:only` requires a specific browser-only reason and a fallback that remains useful.
- Use directly imported wrapper components for client directives; do not assume directives work on dynamic tags or components passed through arbitrary props.

## Routing And Rendering Policy

- In static output, every dynamic route must have `getStaticPaths`.
- In on-demand or SSR dynamic routes, do not use `getStaticPaths`; read `Astro.params`, perform the request-time lookup, and handle missing entries with an explicit 404 or redirect path.
- In `output: "static"`, use route-level `export const prerender = false` only for pages or endpoints that truly need request-time rendering and have an adapter. In `output: "server"`, use `prerender = true` only for routes intentionally carved back to static output.
- Do not use environment-derived dynamic `prerender` values in route files. Route prerender decisions must be static literals or owned by a deliberate integration setup hook.
- Do not use stale `output: "hybrid"` config in new code or migration examples.
- `getStaticPaths` params must match bracket parameter names exactly. Route param values are a string contract; rest parameters may use `undefined`.
- Keep `getStaticPaths` self-contained. Move shared route-generation data into importable module functions instead of reading parent frontmatter state.
- Custom slugs containing `/` require a rest route such as a catch-all route. Do not force slash-containing slugs into a single named parameter route.
- Treat changes under `src/pages` as public URL changes, including endpoint names and extension-bearing endpoint paths.
- Check route priority when adding static routes, named parameters, rest parameters, catch-all routes, and endpoints that could claim the same URL.
- Remember that endpoints can take precedence over pages at the same path. Do not assume a catch-all page receives paths claimed by a more specific endpoint or page.
- Do not assume adding an adapter makes every page SSR. Keep static output as the default unless the project explicitly chooses server output or route-level on-demand rendering.
- Do not switch the whole project to server output for one page unless the deployment and route contract require it.
- Do not assume SSR dynamic routes appear in sitemap output automatically.
- Treat static endpoints as build-time files and server endpoints as request-time handlers. Authentication, mutation, private tokens, webhooks, and DB access belong in server endpoints or actions, not build-time endpoint generation.
- Prefer Astro actions for typed page-owned mutations when they cover the need; use endpoints for non-page consumers, webhooks, files, public APIs, or custom response contracts.
- If `<ClientRouter />` is present, review navigation lifecycle, script re-execution, event attachment, prefetch behavior, `astro:page-load`, `astro:after-swap`, `data-astro-reload`, and view-transition state instead of assuming ordinary full-page navigation.

## Request Pipeline Policy

- Do not create `src/fetch.ts` or `src/fetch.js` just because a project uses Astro 7 or advanced routing. Add or modify a custom fetch entrypoint only when the request pipeline contract requires it.
- If `src/fetch.*` already exists, check whether it is an intentional advanced-routing entrypoint, an accidental reserved-name collision, or disabled or moved through `fetchFile`.
- Prefer preserving Astro's default request pipeline unless there is a named reason to compose handlers directly.
- When direct handler composition is used, record a request pipeline ledger: trailing slash, redirects, sessions, actions, user middleware, rendering, i18n, cache, and any intentionally omitted stage.
- Place session handling before any handler that reads or mutates session state.

## Cache Policy

- Treat `cache` and `routeRules` changes as data-exposure risks, not only performance changes.
- Do not cache authenticated, personalized, locale-sensitive, cookie-dependent, header-dependent, or query-dependent responses unless the cache key, invalidation, and privacy boundary are explicit.
- Check whether the deployment is single-instance or multi-instance before relying on in-memory route cache behavior.
- Do not report route cache behavior from dev mode alone. Cache providers, CDN cache providers, invalidation tags, and server-function bypass behavior need build-preview or deployment-target evidence.
- If invalidation is required, check that tags, paths, webhook source, stale-while-revalidate policy, and provider support are explicit.
- When route cache behavior changes, use `cache-integrity-review` as an adjunct when available and report `HIT`, `MISS`, `STALE`, or equivalent cache evidence only when verified.

## Markdown, Markdoc, Shiki, And Compiler Policy

- When an Astro major migration changes Markdown processing, choose explicitly between the current processor and the new default processor. Keep the unified pipeline when remark, rehype, recma, MDX, or custom Markdown plugin compatibility is unproven.
- Check heading ids, code blocks, syntax highlighting, link rewriting, frontmatter rendering, custom component mappings, and Markdown or MDX snapshots when the processor changes.
- Treat MDX as executable component-capable content. Keep ordinary docs elements static, isolate demos, and avoid hydrating framework runtimes from content files without a specific demo or interaction contract.
- Treat MDX optimizer changes as rendered-output changes. Check escaped HTML, custom component mappings, and `ignoreElementNames` before accepting faster builds.
- Treat Markdoc as a constrained content-authoring boundary. Keep tags, attributes, children, transforms, and validation explicit; do not enable `allowHTML` unless the authoring source is trusted and review/lint coverage exists.
- Do not create Shiki highlighters in hot loops, request handlers, or per-entry render paths. Reuse long-lived highlighters and load only the needed themes and languages.
- Check image handling in Markdown, MDX, and loaders. Raw `<img>` and SVG are not the same as `astro:assets`; remote image sources need an allowlist and dimensions or another CLS strategy.
- Treat stricter compiler output, invalid HTML nesting, non-void tag closure, CSS serialization, and whitespace between inline elements as user-visible migration risks.
- When `compressHTML` changes or defaults differ, verify important rendered text does not lose intended spaces between inline elements.

## Astro Major Migration Deltas

- For v5 to v6 migrations, check removed or changed surfaces before editing call sites: `Astro.glob()` replacement with `import.meta.glob()` or content collections, `.cjs` and `.cts` config removal, `astro:ssr-manifest`, `RouteData.generate()`, old adapter hooks, old `NodeApp` paths, Zod 4 schema effects, and numeric dynamic route params.
- For v6 to v7 migrations, classify each crossed surface by its official migration status before
  editing. The following status map is an official-source snapshot checked on 2026-07-11 and must
  be refreshed before later durable use:
  - remove obsolete `advancedRouting`, `queuedRendering`, and `rustCompiler` experimental flags because their behavior became the default;
  - move stable `cache` and `routeRules` configuration out of the experimental block instead of deleting it;
  - treat `src/fetch.*` as a reserved advanced-routing entrypoint and use `fetchFile` only to relocate or disable that entrypoint intentionally;
  - migrate deprecated `getContainerRenderer()` imports from integration package roots to the documented container-renderer entrypoint;
  - remove unsupported `@astrojs/db` integration usage and exposed transition internals;
  - separately verify direct request handler composition, `logger`, `markdown.processor`, and `compressHTML` behavior against the official v7 guide for the installed target.
- For v6 to v7 migrations with custom Vite config, Rollup hooks, or Astro integrations that call Vite APIs, also use `dependency-upgrade-review` when available.
- Keep each migration delta scoped to the crossed major version. Do not copy old delta checks into ordinary Astro UI, content, or route edits.

## Content SEO Feed Policy

- Every frontmatter field used by routes, SEO, RSS, sitemap, pagination, filtering, or canonical URLs must be declared in the content collection schema.
- Treat content collections as build-time or live data contracts, not folders that automatically become pages.
- Use build-time collections for stable docs, blogs, landing copy, image optimization, MDX processing, and high-cache content. Use live collections only when request-time freshness is worth the runtime cost and feature limits.
- Keep content loader patterns aligned with intended file types such as `.md`, `.mdx`, `.mdoc`, JSON, YAML, or TOML. Do not let new content formats silently disappear from list pages or feeds.
- Do not trust `getCollection()` order. Sort by explicit date, priority, title, or id before rendering lists, pagination, RSS, sitemap-derived lists, or related content.
- Centralize published/draft filtering in a shared query helper when multiple pages, feeds, tag pages, search JSON, or sitemap entries consume the same collection.
- Avoid `render()` in list pages, cards, search indexing, or RSS excerpt generation unless body rendering is the intended cost. Prefer structured excerpt fields and consider `retainBody: false` where the body is not needed.
- Custom loaders must validate data with the collection schema before `store.set()`, preserve stable ids and digests, avoid unconditional `store.clear()` for large remote sources, and provide `filePath`, `fileURL`, or rendered content metadata when images or Markdown rendering depend on it.
- Treat changing a content filename, collection id, or frontmatter slug as a public URL change. Existing public content needs a redirect or explicit canonical decision.
- Draft filtering must be consistent across index pages, detail route generation, tag pages, author pages, pagination, RSS, sitemap customization, and custom page lists.
- Filter drafts before sorting and paginating content.
- Build canonical URLs from Astro URL primitives such as `Astro.site`, `Astro.url`, or page URL values. Do not hand-concatenate `site`, `base`, paths, and slashes.
- Allow frontmatter canonical overrides only for explicit external originals, syndication, or documented canonical exceptions.
- RSS item links must match actual generated public route paths and the project's trailing-slash policy.
- Do not use page-glob RSS helpers to bypass content schema validation when the project already has content collections.
- Keep full-content RSS behind sanitizer and absolute URL handling for internal links, images, and MDX/HTML output. Prefer excerpt feeds when that boundary is absent.
- Sitemap output must contain public canonical URLs only and must exclude drafts, private routes, noindex routes, and unrelated on-demand paths.
- If sitemap custom pages are used, check them against canonical, draft, trailing-slash, base, and locale policy.

## Adapter And Runtime Policy

- Treat adapters as runtime contracts, not deployment decoration. Choose Node, Cloudflare, Vercel, Netlify, or another adapter before relying on filesystem, native modules, image services, sessions, actions, server islands, or edge-only APIs.
- For Cloudflare or other edge runtimes, reject Node-only modules, `node:fs`, native packages, or Node SDK assumptions in on-demand routes unless the target runtime explicitly supports them.
- Distinguish prerender-time Node behavior from request-time edge behavior when an adapter offers separate prerender environment settings.
- Use Astro integrations for renderers, adapters, middleware, custom client directives, and lifecycle work. Use Vite plugins for transform/bundling work, and check Vite environment names before assuming client, SSR, prerender, and Astro contexts behave the same.
- Treat integration array order as behavior. Document first/last requirements when integrations modify config, renderers, middleware, or Vite plugins.
- Custom integrations should use hooks such as config setup, `updateConfig()`, and watch-file APIs instead of mutating global state or caching config across dev reloads.
- Verify production-like output with the target adapter preview when adapter/runtime behavior changed. `astro dev` alone does not prove CDN minification, workerd, server function, image service, hydration, or cache behavior.

## Review Rejection Criteria

Reject or revise a change when:

- A framework island is added without proving framework state or lifecycle is required.
- `client:load` is used for content-heavy, below-the-fold, static, or non-urgent UI.
- A broad layout, page shell, or static content section becomes a framework island without a state/lifecycle reason.
- `client:only` is used because SSR broke, instead of isolating the browser-only dependency.
- A server island contains SEO-critical page meaning, lacks a stable fallback, passes broad props, depends on the page URL without props, or caches personalized HTML publicly.
- Static output dynamic routes lack `getStaticPaths`.
- On-demand or SSR dynamic routes use `getStaticPaths`.
- New code or docs introduce `output: "hybrid"` or environment-derived route `prerender` values.
- Route params do not match bracket names, non-rest params are not strings, or rest params use values other than strings or `undefined`.
- A content slug with `/` is mapped through a non-rest route.
- A collection entry is expected to become a page without an explicit route, `getStaticPaths`, or on-demand route.
- A collection list, pagination, RSS, or sitemap depends on default `getCollection()` ordering.
- Draft filtering is hand-copied instead of centralized across public entrypoints.
- `src/fetch.*` is added without a named request pipeline requirement, or direct handler composition omits a needed pipeline stage.
- Route cache is enabled for authenticated, personalized, locale-sensitive, cookie-dependent, header-dependent, or query-dependent responses without an explicit cache key and invalidation boundary.
- Markdown processor changes skip plugin compatibility or rendered-output checks.
- MDX optimizer, Markdoc `allowHTML`, custom Markdoc tags, Shiki highlighters, or Markdown image paths change without rendered-output, security, or performance evidence.
- Compiler or `compressHTML` changes are accepted without checking invalid HTML nesting, non-void tag closure, CSS serialization, or whitespace-sensitive rendered text when those surfaces are affected.
- Draft filtering differs between lists, detail pages, RSS, sitemap, or pagination.
- Canonical URLs are built by ad hoc string concatenation.
- RSS or sitemap includes drafts, stale paths, wrong trailing slash paths, or paths that the route ledger cannot produce.
- A schema-used frontmatter field is read without being declared in the content schema.
- Runtime request data is placed into build-time content collections.
- Adapter-specific Node or edge APIs are used without target runtime evidence.

<!-- mustflow-section: postconditions -->
## Postconditions

- Build-time and runtime data are separated.
- Client JavaScript is limited to needed islands.
- Server islands preserve first HTML meaning, fallback stability, serialization, cache privacy, and deployment-key behavior.
- Route, endpoint, action, request pipeline, cache, canonical URL, RSS, sitemap, draft, Markdown, Markdoc, Shiki, image, and content schema impact is known.
- SSR, adapter, target runtime, and production-preview changes are verified or reported.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `mustflow_check`

Report missing framework validation, route preview, request pipeline, cache, Markdown, Markdoc, Shiki, image, content schema, RSS, sitemap, canonical, server island, adapter-runtime, or client bundle verification intents when relevant.

When verifiable, report counts for added hydration directives, added client or server island risk, generated public content pages, excluded drafts, RSS items, sitemap URLs, duplicate canonical URLs, route cache rules, and affected Markdown, MDX, Markdoc, Shiki, or image outputs.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If an island is added only to work around static markup, revisit the markup and content boundary first.
- If SSR is requested without adapter evidence, stop and report the deployment contract gap.
- If `output: "hybrid"` appears, replace it with a current static/server plus route-level prerender decision before changing unrelated routing.
- If a server island exposes private data, depends on a deployment key, or changes first-view layout, check fallback, serialization, cache headers, and `ASTRO_KEY` or report the missing deployment contract.
- If custom request pipeline work lacks a pipeline ledger, create the ledger before changing unrelated routing or middleware.
- If cache rules can expose private or personalized data, stop and route through cache integrity review before optimizing performance.
- If Markdown processor compatibility is unknown, keep the existing processor path or report the migration blocker.
- If MDX or Markdoc authoring opens arbitrary JS or HTML, tighten the content-authoring boundary before adding more components.
- If a custom loader skips schema parsing, stable ids, digest handling, or image path metadata, fix the loader contract before adding pages.
- If Shiki setup is slow or memory-heavy, reuse highlighters and restrict theme/language loading before blaming Astro build time.
- If content schema drift appears, fix schema and sample content before adding more pages.
- If draft, canonical, RSS, sitemap, or pagination drift appears, fix the shared content and route contract before adding new entries.
- If a route collision appears, resolve the route ledger before changing unrelated rendering code.
- If target-runtime preview cannot be run through a configured intent, report the missing adapter/runtime smoke coverage.

<!-- mustflow-section: output-format -->
## Output Format

- Boundary checked
- Build/runtime, route, endpoint, action, request pipeline, cache, Markdown, Markdoc, Shiki, image, content, hydration, server island, canonical, RSS, sitemap, ClientRouter, and draft notes
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining Astro risk

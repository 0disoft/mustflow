---
mustflow_doc: skill.astro-code-change
locale: en
canonical: true
revision: 4
lifecycle: mustflow-owned
authority: procedure
name: astro-code-change
description: Apply this skill when Astro config, package metadata, pages, layouts, components, islands, hydration directives, content collections, dynamic routes, adapters, request pipeline, advanced routing, route cache, MDX, Markdown processing, RSS, sitemap, canonical URL, draft, pagination, migration, or build behavior are created or changed.
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

Preserve Astro's static-first model, island hydration boundary, routing contract, request pipeline, content collection schema, canonical URL, RSS, sitemap, adapter, cache, and client bundle boundaries.

The default is no-hydration. Add browser JavaScript only after proving that native HTML, CSS, standard links, forms, details/summary, or a small `.astro` script cannot provide the required behavior.

<!-- mustflow-section: use-when -->
## Use When

- `astro.config.*`, package metadata, `src/pages`, `src/fetch.*`, `.astro`, content config, live config, collections, layouts, components, MDX, Markdown processor config, routes, endpoints, adapters, integrations, islands, route cache, or hydration directives change.
- The task adds or changes a page, blog/docs content, interactive UI, SSR/on-demand rendering, framework component, search/filter UI, request pipeline behavior, route behavior, RSS feed, sitemap, canonical URL, draft handling, migration, or pagination.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The change is framework-agnostic CSS or HTML only; use `html-code-change` or `css-code-change`.
- The interactive component is entirely inside another framework and Astro routing/content is unaffected.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Package metadata, current Astro version, target Astro version when migration is intended, framework integrations, TypeScript config, pages, layouts, components, content config, content files, integrations, adapter config, env declarations, public assets, and tests.
- Astro config values that affect routing, URLs, rendering, request handling, Markdown, and cache: `site`, `base`, `trailingSlash`, `output`, `adapter`, `fetchFile`, `markdown`, `compressHTML`, `cache`, `routeRules`, sitemap integration, MDX integration, and framework integrations.
- Content collection names, loader bases, schemas, slug/id policy, draft fields, date fields, canonical fields, and route files that turn collection entries into pages.
- Current output mode, prerender/SSR policy, hydration conventions, route priority, endpoint layout, request pipeline or middleware layout, RSS generation, sitemap generation, and content schema.
- Markdown processor decision, remark/rehype/recma plugins, custom Markdown imports, heading id policy, syntax-highlighting expectations, and Markdown or MDX snapshots when content rendering changes.
- Cache provider, route cache rules, cache-key inputs, invalidation path, deployment topology, and authenticated or personalized routes when `cache` or `routeRules` change.
- Configured verification intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- Read Astro config, content config, and the affected route tree before changing routing, content, canonical, RSS, sitemap, or hydration behavior.
- Identify current and target Astro major versions before applying migration rules. Apply only the official major upgrade guide deltas crossed by the change, and keep ordinary Astro edits on the version-neutral policies below.
- Identify build-time versus request-time data before adding data access.
- Identify which UI truly needs browser JavaScript and which UI truly needs framework state before adding a framework island.
- Treat file movement under `src/pages`, route parameter changes, and content slug changes as URL contract changes.
- Treat `src/fetch.ts` and `src/fetch.js` as reserved advanced-routing entrypoint candidates unless `fetchFile` disables or moves that entrypoint.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Prefer static `.astro`, HTML, CSS, native links, native forms, details/summary, and small `.astro` scripts before adding a framework island.
- Use hydration directives only for components that need browser interactivity and cannot be handled with a small non-framework script.
- Keep content collection schemas synchronized with frontmatter and collection reads.
- Keep server-only secrets and data access out of client islands.

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
7. Apply the routing, request pipeline, and rendering policies below before adding dynamic routes, catch-all routes, endpoints, adapter changes, `src/fetch.*`, or `prerender` changes.
8. Apply the content, SEO, and feed policy below before changing frontmatter, schemas, slugs, drafts, canonical URLs, pagination, RSS, or sitemap behavior.
9. Apply the cache policy below before changing `cache`, `routeRules`, route-level cache behavior, or cache provider configuration.
10. Apply the Markdown and compiler policy below before changing Markdown processing, MDX, generated markup, `compressHTML`, HTML snapshots, or whitespace-sensitive content.
11. Do not put runtime-only data such as logged-in user state, request-local data, private API responses, or live inventory into build-time collections.
12. Do not enable request-time rendering without the adapter and deployment contract that support it.
13. Keep `set:html` or raw HTML injection behind a trusted and sanitized content boundary.
14. Choose configured verification intents that cover content schema, build, routes, hydration, adapter/runtime, cache, Markdown, request pipeline, and bundle risk when available.

## Hydration Policy

- If HTML, CSS, standard links, native forms, details/summary, or static content can provide the feature, do not add hydration.
- If the behavior is a small browser enhancement such as copy, expand/collapse, theme class toggling, heading-anchor copying, analytics, or a small dropdown, prefer a `.astro` script or custom element over a framework island.
- Add a framework island only after the component needs framework state, lifecycle, or an existing framework component that cannot be replaced safely.
- Use `client:load` only for immediately visible controls that must be interactive as soon as the page loads.
- Use `client:idle` for non-critical above-fold or near-fold enhancements that may hydrate after initial load.
- Use `client:visible` for below-the-fold or heavy widgets that users may never view.
- Treat `client:only` as a last-resort exception. It requires an SSR-impossible browser-only dependency or API and a named reason.
- Do not use framework islands for ordinary links, breadcrumbs, tag lists, card lists, static tables of contents, prose callouts, pagination, or static search links.
- When adding a hydration directive, report the reason and the expected client bundle or island-count impact when verifiable.

## Routing And Rendering Policy

- In static output, every dynamic route must have `getStaticPaths`.
- In on-demand or SSR dynamic routes, do not use `getStaticPaths`; read `Astro.params`, perform the request-time lookup, and handle missing entries with an explicit 404 or redirect path.
- `getStaticPaths` params must match bracket parameter names exactly. Route param values are a string contract; rest parameters may use `undefined`.
- Custom slugs containing `/` require a rest route such as a catch-all route. Do not force slash-containing slugs into a single named parameter route.
- Treat changes under `src/pages` as public URL changes, including endpoint names and extension-bearing endpoint paths.
- Check route priority when adding static routes, named parameters, rest parameters, catch-all routes, and endpoints that could claim the same URL.
- Remember that endpoints can take precedence over pages at the same path. Do not assume a catch-all page receives paths claimed by a more specific endpoint or page.
- Do not assume adding an adapter makes every page SSR. Keep static output as the default unless the project explicitly chooses server output or route-level on-demand rendering.
- Do not switch the whole project to server output for one page unless the deployment and route contract require it.
- Do not assume SSR dynamic routes appear in sitemap output automatically.

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
- When route cache behavior changes, use `cache-integrity-review` as an adjunct when available and report `HIT`, `MISS`, `STALE`, or equivalent cache evidence only when verified.

## Markdown And Compiler Policy

- When an Astro major migration changes Markdown processing, choose explicitly between the current processor and the new default processor. Keep the unified pipeline when remark, rehype, recma, MDX, or custom Markdown plugin compatibility is unproven.
- Check heading ids, code blocks, syntax highlighting, link rewriting, frontmatter rendering, and Markdown or MDX snapshots when the processor changes.
- Treat stricter compiler output, invalid HTML nesting, non-void tag closure, CSS serialization, and whitespace between inline elements as user-visible migration risks.
- When `compressHTML` changes or defaults differ, verify important rendered text does not lose intended spaces between inline elements.

## Astro Major Migration Deltas

- For v5 to v6 migrations, check removed or changed surfaces before editing call sites: `Astro.glob()` replacement with `import.meta.glob()` or content collections, `.cjs` and `.cts` config removal, `astro:ssr-manifest`, `RouteData.generate()`, old adapter hooks, old `NodeApp` paths, Zod 4 schema effects, and numeric dynamic route params.
- For v6 to v7 migrations, check `src/fetch.*` or `fetchFile`, direct request handler composition, `cache`, `routeRules`, `advancedRouting`, `logger`, `queuedRendering`, `rustCompiler`, `markdown.processor`, `compressHTML`, removed or changed `@astrojs/db` usage, transition internals, and `getContainerRenderer()` imports from integration roots.
- For v6 to v7 migrations with custom Vite config, Rollup hooks, or Astro integrations that call Vite APIs, also use `dependency-upgrade-review` when available.
- Keep each migration delta scoped to the crossed major version. Do not copy old delta checks into ordinary Astro UI, content, or route edits.

## Content SEO Feed Policy

- Every frontmatter field used by routes, SEO, RSS, sitemap, pagination, filtering, or canonical URLs must be declared in the content collection schema.
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

## Review Rejection Criteria

Reject or revise a change when:

- A framework island is added without proving framework state or lifecycle is required.
- `client:load` is used for content-heavy, below-the-fold, static, or non-urgent UI.
- `client:only` is used because SSR broke, instead of isolating the browser-only dependency.
- Static output dynamic routes lack `getStaticPaths`.
- On-demand or SSR dynamic routes use `getStaticPaths`.
- Route params do not match bracket names, non-rest params are not strings, or rest params use values other than strings or `undefined`.
- A content slug with `/` is mapped through a non-rest route.
- `src/fetch.*` is added without a named request pipeline requirement, or direct handler composition omits a needed pipeline stage.
- Route cache is enabled for authenticated, personalized, locale-sensitive, cookie-dependent, header-dependent, or query-dependent responses without an explicit cache key and invalidation boundary.
- Markdown processor changes skip plugin compatibility or rendered-output checks.
- Compiler or `compressHTML` changes are accepted without checking invalid HTML nesting, non-void tag closure, CSS serialization, or whitespace-sensitive rendered text when those surfaces are affected.
- Draft filtering differs between lists, detail pages, RSS, sitemap, or pagination.
- Canonical URLs are built by ad hoc string concatenation.
- RSS or sitemap includes drafts, stale paths, wrong trailing slash paths, or paths that the route ledger cannot produce.
- A schema-used frontmatter field is read without being declared in the content schema.
- Runtime request data is placed into build-time content collections.

<!-- mustflow-section: postconditions -->
## Postconditions

- Build-time and runtime data are separated.
- Client JavaScript is limited to needed islands.
- Route, endpoint, request pipeline, cache, canonical URL, RSS, sitemap, draft, Markdown, and content schema impact is known.
- SSR or adapter changes are verified or reported.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `mustflow_check`

Report missing framework validation, route preview, request pipeline, cache, Markdown, content schema, RSS, sitemap, canonical, or client bundle verification intents when relevant.

When verifiable, report counts for added hydration directives, added island risk, generated public content pages, excluded drafts, RSS items, sitemap URLs, duplicate canonical URLs, route cache rules, and affected Markdown or MDX outputs.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If an island is added only to work around static markup, revisit the markup and content boundary first.
- If SSR is requested without adapter evidence, stop and report the deployment contract gap.
- If custom request pipeline work lacks a pipeline ledger, create the ledger before changing unrelated routing or middleware.
- If cache rules can expose private or personalized data, stop and route through cache integrity review before optimizing performance.
- If Markdown processor compatibility is unknown, keep the existing processor path or report the migration blocker.
- If content schema drift appears, fix schema and sample content before adding more pages.
- If draft, canonical, RSS, sitemap, or pagination drift appears, fix the shared content and route contract before adding new entries.
- If a route collision appears, resolve the route ledger before changing unrelated rendering code.

<!-- mustflow-section: output-format -->
## Output Format

- Boundary checked
- Build/runtime, route, endpoint, request pipeline, cache, Markdown, content, hydration, canonical, RSS, sitemap, and draft notes
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining Astro risk

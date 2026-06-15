---
mustflow_doc: skill.image-delivery-performance-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: image-delivery-performance-review
description: Apply this skill when web image delivery, LCP images, hero media, product images, responsive images, `srcset`, `sizes`, Next.js Image, image preload, `imagesrcset`, `imagesizes`, `fetchpriority`, lazy loading, intrinsic dimensions, DPR buckets, AVIF/WebP/JPEG fallback, quality budgets, blur placeholders, base64 inline images, image CDN transformations, cache keys, content-hash URLs, `Accept` negotiation, image proxy allowlists, EXIF orientation, ICC profiles, uploaded SVG handling, CSS background images, `elementtiming`, Resource Timing, DevTools image waterfalls, or real-user image performance evidence need review.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.image-delivery-performance-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Image Delivery Performance Review

<!-- mustflow-section: purpose -->
## Purpose

Review image performance as a delivery and discovery problem: the browser should discover important images early, download the right candidate for the rendered slot, avoid layout shifts, cache stable derivatives, and keep unsafe or abusive image inputs out of the pipeline.

The review question is not "did we convert everything to AVIF?" It is "does the browser fetch the important image first, at the right size and quality, from a cacheable and safe URL?"

<!-- mustflow-section: use-when -->
## Use When

- A web change touches hero images, product images, gallery images, feed images, avatars, thumbnails, image carousels, background heroes, image placeholders, image components, image CDN URLs, image proxy behavior, upload processing, or image cache headers.
- Markup or framework code touches `img`, `picture`, `source`, `srcset`, `sizes`, `loading`, `decoding`, `fetchpriority`, `width`, `height`, `aspect-ratio`, `elementtiming`, responsive preload, `imagesrcset`, `imagesizes`, CSS `background-image`, `image-set()`, Next.js Image or similar framework image components.
- Backend, CDN, or template code touches image transformations, format negotiation, `Accept` forwarding, derivative cache keys, content-hash URLs, width buckets, DPR buckets, quality settings, blur placeholders, base64 inlining, EXIF stripping, orientation handling, ICC profile handling, SVG serving, remote image allowlists, redirect limits, maximum dimensions, or transformation limits.
- A review or final report claims improved image performance, LCP, CLS, waterfall priority, cacheability, byte size, responsive image behavior, image quality, or safer image optimization.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only converting, resizing, or compressing image files with an approved asset pipeline and no delivery, markup, cache, security, or page-performance risk; use `web-asset-optimization` if configured, or report missing `asset_optimize` when it is manual-only.
- The task is broader first-render performance across CSS, fonts, JavaScript, data, streaming, third-party scripts, or TTFB; use `web-render-performance-review` and this skill only for the image-specific part.
- The task is per-frame rendering jank after images have loaded, such as repaint cost, layout thrashing, canvas redraw, or INP delay; use `frame-render-performance-review`.
- The task is full upload lifecycle security for arbitrary files, archives, scanners, thumbnails, downloads, or storage keys; use `file-upload-security-review` and this skill only for image-format and derivative-delivery details.
- Browser waterfalls, Lighthouse, WebPageTest, RUM, CDN logs, image-transform logs, or visual quality tooling are needed but not configured as one-shot intents or provided by the user. Report the measurement gap instead of inventing browser, server, CDN, or package-manager commands.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Image role ledger: route or template, image purpose, first viewport status, likely LCP candidate, decorative versus meaningful semantics, carousel position, rendered slot size, breakpoints, DPR expectation, and alt/accessibility ownership.
- Discovery and priority ledger: HTML location, CSS background or markup discovery, framework image component behavior, preload use, `fetchpriority`, competing high-priority resources, SSR or CSR timing, and waterfall or static evidence.
- Responsive candidate ledger: `src`, `srcset`, `sizes`, `picture` source order, `imagesrcset`, `imagesizes`, `sizes="auto"` fallback, framework `fill` behavior, width buckets, DPR buckets, and selected candidate evidence.
- Layout stability ledger: `width`, `height`, `aspect-ratio`, placeholders, blur placeholder size, lazy image dimensions, ad or embed slots, and CLS or layout-shift evidence.
- Format and quality ledger: image content type, AVIF/WebP/JPEG/PNG/SVG/lossless choice, fallback quality, progressive JPEG need, per-format quality settings, target byte budgets, visual comparison method, and color fidelity requirements.
- Pipeline and metadata ledger: original storage, deterministic derivative recipe, crop strategy, EXIF orientation, metadata stripping, GPS/XMP removal, ICC or sRGB handling, maximum pixel dimensions, and transform failure behavior.
- CDN and cache ledger: content-hash URLs, cache-control headers, immutable asset policy, derivative cache key dimensions, `Accept` forwarding, format negotiation, cache fragmentation, invalidation, and origin fallback behavior.
- Safety and abuse ledger: remote image host/path/query allowlist, quality and width allowlist, redirect limit, private-network or SSRF exposure, SVG serving policy, content disposition, CSP, maximum transform cost, and public proxy risk.
- Evidence ledger: DevTools Network waterfall, initial and final priority, LCP element, Resource Timing, `elementtiming`, RUM, CDN logs, image proxy logs, bundle or template tests, configured command output, or missing evidence.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Required inputs are available from current files, diffs, docs, configured outputs, or user-provided evidence, or missing inputs can be reported without guessing.
- If framework image APIs, browser attributes, CDN behavior, image proxy behavior, or cache semantics are version-sensitive, verify against project dependencies or current official documentation before durable docs or code comments rely on them.
- If the change touches actual upload security, cache privacy, file serving headers, accessibility semantics, or backend image processing, also use the matching narrower skill.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Adjust image markup, `picture` source order, `srcset`, `sizes`, `loading`, `decoding`, `fetchpriority`, responsive preload, `imagesrcset`, `imagesizes`, intrinsic dimensions, `aspect-ratio`, placeholders, CSS background preload hints, framework image component props, width and DPR buckets, format fallback policy, quality settings, metadata handling notes, cache headers, derivative cache key rules, `Accept` forwarding notes, remote image allowlists, transform limits, focused tests, and directly synchronized docs or templates.
- Add lightweight assertions for installed templates, generated markup, image route options, cache headers, allowlists, or package output when the repository already has a pattern or configured command intent.
- Keep edits local to image delivery and safety. Do not introduce a new CDN, image proxy, optimizer service, upload scanner, visual-quality tool, browser benchmark harness, or dependency without explicit scope and command-contract support.
- Do not trade accessibility, color fidelity, privacy, SVG safety, cache correctness, or layout stability for smaller bytes.

<!-- mustflow-section: procedure -->
## Procedure

1. Identify important images before optimizing formats. Name the likely LCP image for each relevant viewport, whether it is markup, framework-rendered, CSS background, carousel first slide, or client-inserted media.
2. Do not lazy-load the LCP image. Keep first-viewport hero or primary product media discoverable in HTML when possible, and reserve `fetchpriority="high"` for the one true critical image rather than every visible image.
3. Keep secondary first-view images from becoming fake VIPs. Carousel slides after the first, below-the-fold cards, thumbnails, and decorative images should not all receive high priority.
4. Use preload as a discovery fix, not as a default boost. Prefer normal markup plus `fetchpriority` when the scanner can see the image early. Use responsive preload when CSS backgrounds, JavaScript insertion, client rendering, or dynamic hero selection hides discovery.
5. Match responsive preload to responsive markup. If the eventual image uses `srcset` and `sizes`, the preload should use `imagesrcset` and `imagesizes`; otherwise the browser can download the wrong candidate and then download the right one later.
6. Do not preload every format in a `picture` fallback stack. Preload one preferred candidate when needed and let `picture` choose AVIF, WebP, JPEG, PNG, or SVG fallback through normal selection.
7. Treat `sizes` as the slot contract. Check that it matches the actual CSS layout at each breakpoint. A correct `srcset` still wastes bytes when `sizes` silently says `100vw`.
8. Check framework image components for hidden defaults. For fill-style responsive images, require an explicit `sizes` value that reflects the rendered slot.
9. Use `sizes="auto"` only where it fits. Lazy images with stable dimensions can benefit from auto sizing, but include a fallback for older targets and do not use it to hide missing layout information.
10. Reserve image geometry. Add `width`, `height`, `aspect-ratio`, or stable containers for eager and lazy images so the browser can calculate aspect ratio and avoid layout shifts before bytes arrive.
11. Cap DPR and width buckets by real design slots. Do not generate unbounded widths or default every thumbnail, avatar, and feed card to 3x variants. Keep buckets aligned with layout tokens and common viewport widths.
12. Avoid cache-key confetti. Transformation URLs should normalize width, format, quality, crop, DPR, and other parameters to a bounded set. Do not allow arbitrary one-pixel widths, arbitrary quality values, or raw query strings to split CDN cache.
13. Choose format by image content. AVIF, WebP, JPEG, PNG, SVG, and lossless encodings have different strengths. Icons, UI screenshots, transparent graphics, photos, and product images may need different rules.
14. Keep JPEG fallback respectable. Unsupported modern formats should not leave a slow or visibly broken experience. Preserve progressive JPEG where it improves large-photo perception.
15. Set quality per format and image role. `q=75` is not equivalent across JPEG, WebP, and AVIF. Use role budgets such as thumbnail, feed image, product image, and hero image, then check visual quality.
16. Use byte budgets and visual evidence. Prefer target byte ceilings plus DSSIM, SSIM, Butteraugli, snapshot comparison, or manual review over one global quality constant.
17. Apply orientation before stripping metadata. Autorotate camera uploads first, then remove EXIF, GPS, XMP, and other metadata that should not ship.
18. Preserve color intentionally. For products, fashion, interiors, photography, and design portfolios, retain needed ICC data or normalize to sRGB rather than dropping profiles blindly.
19. Treat user-uploaded SVG as active content risk. Do not serve arbitrary SVG inline or as trusted image content without a deliberate SVG policy, CSP, content disposition, and sanitizer or conversion boundary.
20. Use markup for meaningful images. Product, article, profile, and content images should use `img` or `picture` so the browser can apply preload scanning, lazy loading, dimensions, priority, and accessibility semantics. CSS background images are for decoration unless a product decision says otherwise.
21. Preload CSS background LCP images when they remain backgrounds. CSS discovery comes after stylesheet fetch and parse, so background heroes need an explicit discovery strategy.
22. Lazy-load below-fold images, not first-view images. Native lazy loading is usually enough for ordinary offscreen images when dimensions are reserved.
23. Do not call a giant lazy gallery optimized. Lazy loading delays network work; it does not solve DOM count, decode cost, memory pressure, or scroll work. Large galleries and feeds may need virtualization or pagination.
24. Use `decoding="async"` for noncritical images when it fits. Do not assume it is right for the LCP image without waterfall and LCP evidence.
25. Keep blur placeholders tiny. A placeholder should be a few hundred bytes or a tiny data URL, not a second meaningful image that competes with the real one.
26. Inline base64 only for tiny assets. Product images, thumbnails, and large placeholders should remain independently cacheable image resources instead of making HTML heavy and uncacheable.
27. Use content-hash URLs for immutable derivatives. Stable derivatives can use long public immutable caching when the URL changes with content. Do not overwrite `/image.jpg` and expect safe long caching.
28. Keep originals. Store one trustworthy original and derive deterministic variants so future formats, crops, quality policies, and DPR strategies can be regenerated without generation loss.
29. Preserve `Accept` through CDN and proxy layers. Format negotiation needs the browser's supported image formats. If `Accept` is dropped, cache and format behavior can silently collapse.
30. Lock down image optimization APIs. Remote URL, host, path, query, redirect count, size, width, quality, and format should be allowlisted or bounded so the optimizer does not become a public scraping proxy or transform-cost sink.
31. Check the waterfall before claiming success. Inspect or request evidence for discovery time, initial and final priority, candidate size, cache status, LCP element, duplicate downloads, and whether important files arrive first. Without that evidence, label the result static image-delivery risk.

<!-- mustflow-section: postconditions -->
## Postconditions

- Important image role, discovery path, priority, responsive candidate selection, dimensions, format, quality, cache behavior, metadata handling, and safety boundary are explicit where relevant.
- Lazy LCP images, priority inflation, hidden CSS background discovery, incorrect `sizes`, missing responsive preload attributes, multi-format preload, missing dimensions, unbounded DPR or width variants, arbitrary transformation URLs, weak fallback formats, one-size quality settings, metadata mishandling, color-profile loss, unsafe SVG serving, oversized blur placeholders, base64 bloat, missing content hashes, dropped `Accept`, public optimizer proxy behavior, and Lighthouse-only claims are fixed or reported.
- Image performance claims are backed by current configured evidence or labeled as static image-delivery risk, manual-only measurement, or missing evidence.
- Accessibility, layout stability, privacy, color fidelity, cache correctness, security, and framework semantics remain intact or are reported as tradeoffs.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use the narrowest configured test, build, docs, release, or mustflow intent that covers the changed image markup, template, cache, or proxy surface. Use browser waterfalls, Lighthouse, WebPageTest, CDN dashboards, image-quality tools, dev servers, or optimizer scripts only when they are configured one-shot intents or explicitly approved by the user.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the LCP image, rendered slot, or cache key is unknown, report the unknown before adding priority hints, preloads, new formats, or cache policy.
- If a configured test or build fails, preserve the failing intent and output tail, then fix only the image delivery, template, cache, or safety boundary exercised by the failure.
- If the fix needs unconfigured image conversion, CDN changes, production waterfall data, visual-quality tooling, dev servers, framework upgrades, or package-manager scripts, stop and report the missing command or product decision.
- If byte reduction conflicts with accessibility, color fidelity, privacy, SVG safety, cache safety, or layout stability, keep the safer behavior and report the performance tradeoff.
- If verification fails after an image-delivery change, use `failure-triage` before broadening the fix.

<!-- mustflow-section: output-format -->
## Output Format

- Image delivery surface reviewed
- Image role, discovery, priority, responsive candidate, layout, format, quality, cache, pipeline, and safety ledgers
- Findings or fixes
- Evidence level: measured, configured-test evidence, static image-delivery risk, manual-only, missing, or not applicable
- Command intents run
- Skipped browser, CDN, image-quality, or optimizer measurements and reasons
- Remaining image-delivery performance risk

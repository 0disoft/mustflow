---
mustflow_doc: skill.svg-vector-asset-production
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: svg-vector-asset-production
description: Apply this skill when editable SVG icons, logos, illustrations, vector asset sets, AI-assisted SVG generation, SVG simplification, SVGO profiles, vector style manifests, structural linting, or render-difference validation are created, optimized, reviewed, or integrated.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.svg-vector-asset-production
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

# SVG Vector Asset Production

<!-- mustflow-section: purpose -->
## Purpose

Produce editable, structurally bounded, safe, and visually verified SVG assets. Treat visual design,
SVG reconstruction, deterministic validation, and delivery optimization as separate stages.

<!-- mustflow-section: use-when -->
## Use When

- An SVG icon, logo, illustration, sprite, symbol set, or other vector source is generated or edited.
- A raster or model-generated visual reference must be reconstructed as real vector geometry.
- Existing SVGs need structural simplification, path reduction, style normalization, or SVGO policy.
- A family of SVGs needs consistent geometry, palette, stroke, spacing, detail, or visual weight.
- SVG safety, editability, multi-size rendering, or source-to-optimized reproducibility must be reviewed.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only optimizes PNG, JPEG, WebP, AVIF, GIF, or another raster web asset; use
  `web-asset-optimization`.
- The task only creates general game raster sprites, atlases, tiles, or engine import metadata; use
  `ai-game-asset-production` unless SVG production is itself material.
- The SVG is untrusted user content rendered in an application and the task is primarily an upload,
  sanitization, authorization, or browser-security review; use the matching security skill too.
- Exact archival bytes must be preserved and no derived production asset is requested.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Asset role, intended consumers, embedding mode, target sizes, and accessibility semantics.
- Visual reference or brief, editable source ownership, and source-versus-derived output paths.
- Geometry contract: viewBox, content bounds, grid, symmetry, spacing, palette, strokes, allowed
  elements and attributes, complexity budgets, and permitted exceptions.
- Representative approved assets or a contact sheet when matching an existing family.
- Renderer matrix, visual-difference tolerance source, optimization profile, and configured command
  intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Missing design decisions are recorded as unresolved inputs; calibration examples are not silently
  promoted into universal thresholds.
- Higher-priority instructions and the selected repository command contract have been checked.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Edit SVG sources, derived SVG assets, style manifests, deterministic transformation or validation
  code, fixtures, tests, and directly synchronized documentation within the selected asset scope.
- Do not add a generator, optimizer, browser service, dependency, or raw command authority merely
  because an external recommendation mentions one.

<!-- mustflow-section: procedure -->
## Procedure

1. Separate the pipeline into visual design, constrained SVG reconstruction, structural and safety
   validation, multi-size rendering, optimization, render comparison, and delivery. Even when one
   model performs multiple stages, use distinct prompts and artifacts so a visual draft is not
   mistaken for valid SVG structure.
2. Define a machine-checkable asset contract before generating XML. Include the coordinate system,
   content bounds, grid and precision, semantic layers and ids, primitive preference, palette and
   stroke roles, spacing scale, symmetry rules, detail tier, element and path-command budgets,
   accessibility behavior, and consumer profile. Treat example values such as 24 or 512 viewBoxes,
   node counts, and pixel tolerances as candidates to calibrate for the asset, not defaults.
3. Plan a bounded scene graph before writing SVG. Decompose the image into semantic elements and
   groups; prefer `rect`, `circle`, `ellipse`, `line`, `polyline`, and `polygon` for regular shapes.
   Reserve `path` for geometry that those primitives cannot express clearly. Keep editable text as
   text unless the delivery contract explicitly requires outlined glyphs.
4. Design geometry instead of tracing pixels. Do not encode antialiasing, texture boundaries, or
   raster noise as many tiny shapes. Put anchors at corners, extrema, and meaningful curvature
   changes; use a small number of arcs or Bezier segments rather than short-line approximations.
   Preserve intentional tangent continuity and distinguish mathematical alignment from documented
   optical correction.
5. Reuse meaningful repeated or symmetric geometry only when the consumer supports it and the
   definition-plus-reference structure improves maintainability or size. Avoid both independently
   redrawing symmetric parts and introducing `defs` or `use` indirection for trivial repetition.
6. Separate geometry from style. Inherit common presentation attributes from a suitable group,
   use semantic palette roles or `currentColor` where the embedding mode supports them, and avoid
   repeated inline values. Do not assume page CSS reaches a standalone SVG loaded through `img`.
7. Parse every generated or external SVG as XML before optimization. Reject disallowed elements,
   event attributes, scripts, `foreignObject`, external references, dangerous URL schemes, external
   entities, embedded raster data, broken internal references, duplicate ids, non-finite or extreme
   coordinates, degenerate shapes, and contract budget violations. Regex removal and SVGO are not
   sanitization boundaries. Restrict `use` and CSS `url()` references according to the asset contract.
8. Keep editable source and generated delivery output distinct. Preserve `viewBox`; select separate
   optimization profiles for standalone, inline, sprite, and brand-sensitive assets. Preserve
   `xmlns`, ids, titles, descriptions, or exact curves when their consumer contract requires them.
   Treat GUI optimizers as configuration exploration, not as the reproducible build authority.
9. Apply conservative, structure-preserving cleanup before geometry-changing optimization. Gate
   path conversion, merging, reuse, transform folding, precision loss, or off-canvas removal behind
   render comparison. Reduce geometric complexity against an explicit render-error budget, not only
   source bytes or a target percentage.
10. Render at every material target size and at a larger curve-inspection size. Check clipping,
    half-pixel blur, collapsed gaps, stroke consistency, symmetry, optical balance, accessibility,
    and renderer-specific differences. Compare source and candidate pixels or contours with a
    tolerance derived from approved references and the smallest intended display size.
11. For asset families, make a versioned style manifest the source of truth and compare each new
    asset in a contact sheet with representative approved assets. Measure content bounds, opaque
    area, centroid, margins, negative space, stroke share, and detail density as diagnostic signals;
    flag outliers relative to the reference distribution rather than forcing unlike silhouettes to
    one arbitrary value. Critique and revise only the identified geometry or style deviation.
12. Require post-optimization parsing, valid internal references, preserved consumer semantics,
    bounded visual difference, deterministic repeated output, and no unexplained size regression.
    Record source, optimized and compressed bytes, element and path-command counts, target-size
    render results, configuration hash, tool version, and exception ledger when the repository has
    a report surface.

<!-- mustflow-section: postconditions -->
## Postconditions

- The delivered SVG is real vector geometry under the declared contract, or embedded raster and
  unsupported effects are explicitly reported.
- Editable source, derived output, optimizer configuration, and validation evidence have named
  ownership and do not silently overwrite one another.
- Structural safety, multi-size appearance, consumer semantics, and deterministic regeneration are
  evidenced independently; a smaller file alone is not acceptance proof.

<!-- mustflow-section: verification -->
## Verification

Use the narrowest configured oneshot intents that cover the changed surfaces:

- `lint`
- `build`
- `test_related`
- `test`

Prefer structural fixtures plus target-size render comparisons. If the selected repository lacks a
configured renderer, optimizer, or visual-difference intent, report that boundary instead of
running an inferred tool or claiming visual equivalence from XML inspection.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the visual draft cannot be represented within the geometry contract, simplify the visual brief
  or record a deliberate exception; do not disguise raster tracing as vector complexity.
- If sanitization or structure lint fails, stop before optimization and delivery.
- If an aggressive optimization crosses the render tolerance or breaks references, fall back to the
  last conservative candidate and identify the responsible transformation.
- If renderer results disagree, preserve the broadly compatible structure or narrow the supported
  consumer matrix explicitly.
- If a style outlier is intentional, document the asset-scoped exception rather than weakening the
  family manifest for every asset.

<!-- mustflow-section: output-format -->
## Output Format

- Asset role, consumers, and source or derived ownership
- Geometry, style, safety, complexity, and accessibility contract
- Scene-graph and real-vector assessment
- Source, optimization profile, and deterministic pipeline result
- Multi-size and cross-renderer comparison evidence
- Asset-family consistency and exception result
- Command intents run or skipped
- Remaining visual, structural, security, accessibility, or compatibility risk

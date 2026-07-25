---
mustflow_doc: skill.ai-game-asset-production
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: ai-game-asset-production
description: Apply this skill when AI-generated 2D game assets such as transparent PNGs, icons, sprites, animation frames, tiles, backgrounds, atlases, or engine-ready textures are planned, generated, normalized, integrated, reviewed, or validated as a repeatable production pipeline.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.ai-game-asset-production
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

# AI Game Asset Production

<!-- mustflow-section: purpose -->
## Purpose

Turn generated pictures into reproducible 2D game assets by making the project contract, source
provenance, geometry, alpha handling, pivots, animation semantics, engine import behavior, and
acceptance evidence authoritative instead of treating prompt wording or a visually pleasing master
image as the production contract.

<!-- mustflow-section: use-when -->
## Use When

- AI-generated transparent PNGs, icons, sprites, sprite sheets, animation frames, tiles, terrain
  transitions, parallax backgrounds, props, VFX, or texture atlases are created or revised for a game.
- Assets look acceptable alone but drift in projection, scale, lighting, palette, edge continuity,
  pivot, ground contact, collision alignment, frame identity, or runtime filtering.
- A repository needs a repeatable raw-to-engine asset pipeline, asset contract, atlas metadata,
  automatic image checks, contact sheets, or engine-scene acceptance fixtures.
- A bug reports baked checkerboards, matte fringes, texture bleeding, trim jitter, foot sliding,
  broken animation loops, inconsistent directional sprites, or seams between tiles and backgrounds.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only optimizes website image delivery, responsive sources, LCP behavior, or browser cache
  policy; use `web-asset-optimization` or `image-delivery-performance-review`.
- The task only creates a concept illustration with no game-engine integration, repeatability, or
  asset acceptance requirement.
- The main deliverable is a 3D mesh, rig, topology, UV layout, shader, or physically based material;
  this skill may use a 3D proxy as an input but does not own a full 3D production pipeline.
- The task asks for a legal conclusion about copyright, trademark, platform policy, or commercial
  rights. Use current authoritative sources and `provenance-license-gate`; do not convert this
  procedure into legal advice.
- The task only reviews UI motion state, interruption, or reduced-motion behavior rather than game
  sprite frame production; use `motion-system-contract-review`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Asset inventory and role for each output: isolated cutout, opaque background, translucent effect,
  repeating tile, transition mask, icon, pixel art, painted sprite, normal map, or data mask.
- Target engine and renderer version, camera or projection, final display sizes, pixels per world
  unit, color-space and straight or premultiplied alpha convention, filtering, mipmap, wrap,
  compression, and atlas policy.
- Existing asset contract, style references, turnaround or calibration set, palette, meaningful
  anchors, collision ownership, and animation state definitions; missing decisions must be named.
- Source and provenance ledger for generators, model or checkpoint components, reference images,
  licenses or permissions, human edits, and retained source files.
- Repository paths and ownership for immutable source material, editable work files, generated
  engine outputs, metadata, tests, and review artifacts.
- Acceptance metrics with a source of truth, measurement scale, threshold, exception, and failure
  action, plus configured command intents in the selected repository.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the use conditions and does not match an exclusion.
- Higher-priority instructions, the selected repository's command contract, current engine setup,
  and existing asset pipeline have been inspected.
- The final runtime scale and renderer behavior are known, or the work stops at a calibration plan
  instead of inventing production thresholds.
- Reference inputs have usable provenance, or unknown-rights inputs are excluded from shipped
  assets and reported.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or update project-owned asset contracts, source manifests, masks, metadata, image-processing
  code, atlas configuration, engine import settings, acceptance scenes, fixtures, tests, and directly
  synchronized documentation within the user-selected asset scope.
- Preserve immutable generated originals and manually authored masters when the repository declares
  them as sources. Treat derived engine output as regenerable unless the repository says otherwise.
- When durable automation is needed, use the repository's existing cross-platform toolchain; under
  the host policy, new repository automation defaults to Bun-backed TypeScript unless a nearer rule
  selects another runtime.
- Do not install dependencies, call online generators, upload reference material, change legal or
  platform policy, regenerate broad asset catalogs, or run unconfigured engine tools.
- Do not derive gameplay collision directly from decorative alpha unless the project contract
  explicitly defines that bounded case.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify every requested asset by rendering role and reject a one-setting-for-every-PNG pipeline.
   Color textures, normal or mask data, hard cutouts, soft VFX, repeatable tiles, icons, and animation
   frames have different alpha, color-space, resize, compression, and verification contracts.
2. Locate or define the smallest project-owned asset contract. Record canvas and target sizes,
   projection and camera, pixels per unit, ground line, safe region, palette and value structure,
   light direction, alpha convention, layers, anchors, sockets, collision profile, atlas rules, and
   engine import expectations. Prompt text may derive from this contract but never replaces it.
3. Build a provenance and replacement ledger before generation. Separate provider permission,
   copyrightability, third-party infringement risk, and exclusivity. Record the exact generator and
   component chain, reference rights, source hashes, human contributions, review status, output
   hashes, and every shipped use so one disputed asset can be quarantined and replaced.
4. Establish a calibration set before bulk generation: geometric primitives, a humanoid or object
   scale reference, representative materials, smallest target-size previews, tile neighbors, and the
   engine acceptance scene. Reject model, style, or post-processing combinations that cannot hold
   geometry, scale, light, or identity across this set.
5. Freeze invariants separately from variables. Projection, camera, scale, light, palette, outline,
   body ratios, anchors, and master references stay fixed; pose, expression, equipment, damage, and
   material variants change deliberately. Derive variants from the approved master and original
   reference set, not from a chain of progressively drifted outputs.
6. Preserve stages as source, work, and generated engine output. Keep generator settings and source
   hashes with the immutable source; perform masks, paintover, segmentation, alignment, and palette
   work in the editable stage; rebuild atlas and engine output from declared inputs.
7. Apply the alpha, icon, separation, trim, resize, atlas, and runtime checks in
   `references/raster-alpha-atlas-checklist.md`. Test isolated cutouts on light, dark, and saturated
   backgrounds. Preserve soft foreground alpha for glass, smoke, fire, and light instead of forcing
   a binary mask.
8. Apply the tile, background, object-contact, and animation branches in
   `references/tile-animation-checklist.md`. Generate tile topology and masks before surface detail,
   align frames by semantic anchors, keep gameplay shapes separate from art, and preserve full
   untrimmed-frame metadata after packing.
9. Define the automatic acceptance contract from
   `references/asset-contract-validation.md`. Every metric needs a named coordinate space, target
   scale, threshold source, exception policy, and deterministic failure action. A candidate starting
   value is calibration evidence, not a universal default.
10. Validate the derived output after the same resize, premultiplication, packing, compression,
    filtering, mipmap, and color-space conversions used by the shipped build. Inspect native and
    reduced scales in the actual renderer; source-PNG inspection alone cannot prove engine behavior.
11. Classify each candidate as accepted, rework, quarantined, or rejected. Do not move a failing
    threshold to fit a favored image. If the contract is wrong, revise it with new gameplay or
    rendering evidence and re-evaluate the full calibration set.
12. Run only configured oneshot intents in the selected repository. Keep asset generation,
    conversion, tests, builds, and engine verification local to that repository's command authority.

<!-- mustflow-section: postconditions -->
## Postconditions

- Every shipped output is traceable to project-owned contract fields, source inputs, transformation
  settings, metadata, and an acceptance result.
- Transparent edges, pivots, trim offsets, atlas padding, tile seams, frame identity, contact points,
  and runtime import settings are verified at the target scale or explicitly reported as unverified.
- Gameplay collision and event timing remain project-owned semantic data rather than accidental
  consequences of generated pixels.
- Missing provenance, engine evidence, thresholds, or configured verification causes a bounded stop,
  quarantine, or calibration report rather than an unsupported completion claim.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available in the selected repository:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `mustflow_check`

Prefer the narrowest asset compiler, image validator, atlas, engine import, or acceptance-scene intent
declared by the project. A passing static PNG check does not replace renderer or engine evidence.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If projection, target scale, alpha convention, pivot, or runtime import behavior is unknown, stop
  production output and return the missing contract fields plus a calibration plan.
- If reference provenance or commercial-use evidence is missing, exclude that input and its
  derivatives from shipped output; do not make a legal assumption from generator marketing copy.
- If an isolated cutout fails RGBA, border-alpha, fringe, clipping, or safe-margin checks, quarantine
  it before atlas packing. If a translucent effect fails a cutout-only rule, fix the role contract
  rather than destroying its soft alpha.
- If frames fail identity, anchor, foot-contact, skeleton, arc, timing, or loop gates, rework the
  source frames or metadata before assembling the sheet.
- If source files pass but engine output fails, inspect premultiplication, color space, padding,
  extrude, UVs, filtering, mipmaps, wrap, compression, and import version before regenerating art.
- If a needed validator or engine check lacks a configured intent, report the missing intent and the
  exact unverified risk instead of running a guessed command.

<!-- mustflow-section: output-format -->
## Output Format

- Asset roles and target engine contract
- Source, work, generated-output, and provenance boundaries
- Geometry, alpha, pivot, tile, animation, atlas, and engine findings
- Acceptance metrics, threshold sources, exceptions, and candidate disposition
- Files and metadata created or changed
- Command intents run
- Skipped checks and reasons
- Remaining visual, gameplay, provenance, or runtime risk

---
mustflow_doc: skill.threejs-code-change
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: threejs-code-change
description: Apply this skill when Three.js renderers, scenes, cameras, meshes, materials, textures, shaders, glTF assets, animation, picking, WebGL, WebGPU, WebXR, resource disposal, or Three.js performance and tests are created, changed, reviewed, migrated, or upgraded.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.threejs-code-change
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

# Three.js Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve renderer, scene, asset, interaction, GPU-resource, compatibility, and frame-budget
contracts while making focused Three.js changes. Treat a visible frame as weak evidence: draw-call
churn, shader recompilation, texture residency, hidden render passes, stale bounds, and leaked
listeners or GPU resources can remain broken after the scene appears correct.

<!-- mustflow-section: use-when -->
## Use When

- `WebGLRenderer`, `WebGPURenderer`, scenes, cameras, controls, lights, shadows, render targets,
  post-processing, TSL, node materials, custom shaders, or animation loops change.
- Geometry, materials, textures, glTF/GLB, Draco, Meshopt, KTX2, instancing, skinning, animation,
  disposal, context or device loss, or renderer migration changes.
- `Raycaster`, pointer interaction, GPU picking, BVH acceleration, layers, WebXR input, or dense-scene
  interaction changes.
- Three.js package metadata, import boundaries, browser targets, tests, performance claims, or
  migration documentation change.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- Babylon.js, PlayCanvas, a native engine, or raw WebGPU owns the rendering boundary.
- The task changes only a static model or texture without changing Three.js loading, rendering,
  ownership, compatibility, or package behavior.
- The task asks only for the current Three.js release number; use source-freshness guidance unless
  code or durable documentation changes too.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Installed and supported Three.js versions, import paths, addons, bundler, framework lifecycle,
  browser and device targets, and configured verification intents.
- Renderer ledger: backend, asynchronous initialization, fallback, canvas owner, animation-loop
  owner, resize and pixel-ratio policy, context/device-loss behavior, and render-target owners.
- Resource ledger: scene roots, geometries, materials, textures, skeletons, animation mixers,
  controls, listeners, observers, workers, decoders, caches, and disposal owners.
- Performance evidence: CPU and GPU frame time, `renderer.info`, draw calls, triangles, texture and
  geometry counts, shader compilation, upload time, overdraw, render-target sizes, and target-device
  measurements.
- Interaction ledger: canvas bounds, pointer normalization, pickable set, domain mapping, layers,
  bounds freshness, instance mapping, hover frequency, and accessibility fallback.

<!-- mustflow-section: preconditions -->
## Preconditions

- Read repository package and lock evidence before choosing current Three.js APIs or migration
  advice. Refresh official docs, migration notes, package metadata, and browser platform sources
  before embedding exact version, deprecation, removal, or support claims.
- Classify WebGL, WebGPU, TSL/node-material, and WebXR features independently. A stable Three.js
  release does not make every renderer backend or browser platform universally available.
- Identify the framework component or route that owns mount, resize, animation, and cleanup before
  editing renderer lifecycle.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Make focused Three.js source, tests, package metadata, docs, assets, and configuration changes
  required by the task.
- Add instrumentation or regression tests for lifecycle, picking, fallback, resource ownership,
  shader/material behavior, bounds, resize, and performance contracts.
- Preserve fallback and compatibility paths when supported browsers or devices still need them.
- Do not switch renderer backends, force WebGPU-only delivery, raise pixel ratio, add expensive
  passes, replace picking strategies, or introduce compression/decoder infrastructure without
  repository evidence and an explicit compatibility and rollout plan.

<!-- mustflow-section: procedure -->
## Procedure

1. **Classify package and renderer tracks.**
   - Separate the repository-pinned release, a proposed target release, WebGLRenderer,
     WebGPURenderer, TSL/node-material, addon, and browser-platform tracks.
   - Verify migration notes across every crossed release. Do not treat a future migration heading,
     prerelease tag, or dev-branch documentation as the current stable contract.
   - Check import boundaries such as core, addons, `three/webgpu`, and `three/tsl` against the
     installed version and bundler instead of copying current examples into older support ranges.
2. **Own renderer and frame lifecycle.**
   - Make asynchronous renderer initialization, first render, animation loop, resize, pixel ratio,
     visibility suspension, and teardown explicit and idempotent.
   - Prefer `renderer.setAnimationLoop()` when renderer or XR lifecycle requires it. For on-demand
     rendering, verify initialization and invalidate only from owned state changes.
   - Update canvas size, camera projection, pixel ratio, composer and render-target sizes together.
     Treat device pixel ratio as a GPU workload multiplier and cap or adapt it from measurements.
3. **Keep scene state and ownership separate.**
   - Use the scene as a render tree, not the domain database. Maintain entity-to-object and
     instance-to-entity mappings outside renderer internals.
   - Record shared versus exclusive ownership before disposal. Removing an object from a scene does
     not dispose geometry, material, texture, render target, skeleton, mixer, control, listener,
     worker, decoder, or cache resources.
   - Verify route changes, hot reload, asset swaps, and repeated mount/unmount cycles do not produce
     stepwise growth in renderer counters or duplicate loops and listeners.
4. **Review geometry, bounds, culling, and instancing.**
   - Reduce draw calls and state changes before chasing small JavaScript loop savings. Use merged
     geometry, instancing, spatial chunks, LOD, and culling only when interaction, update, and
     disposal semantics remain correct.
   - After transform or attribute changes, update the required dirty flags and recompute stale
     bounding volumes used by frustum culling or raycasting.
   - Keep `InstancedMesh.instanceId` as a render index, not a domain identity. Define remapping,
     deletion, visibility, hover, color, and bounds behavior explicitly.
5. **Review materials, textures, shaders, lights, and passes.**
   - Separate color textures from numeric data maps and verify color-space, format, compression,
     mipmap, filtering, anisotropy, and upload policy per texture class.
   - Treat material define changes as shader-variant changes. Prefer uniforms for value changes,
     preload critical shader variants, and measure compile and upload stalls.
   - Count shadow maps, transparent overdraw, cameras, mirrors, post-processing passes, and render
     targets as repeated scene work. Keep expensive effects bounded by a target-device budget.
   - Verify custom GLSL, `onBeforeCompile`, post-processing, and render-target assumptions before a
     WebGPU or TSL migration; changing the renderer constructor is not a complete migration.
6. **Review picking and interaction.**
   - Convert pointer coordinates from `canvas.getBoundingClientRect()` into normalized device
     coordinates. Do not normalize against the window unless the canvas contract is truly full-screen.
   - Raycast a maintained pickable set or interaction proxies, not the whole scene on every pointer
     move. Use layers deliberately and remember that parent-layer mismatch does not prune every
     descendant traversal contract automatically.
   - Map intersection objects to domain owners. Account for back-face rules, line/point thresholds,
     transparent or discarded pixels, shader deformation, stale matrices and bounds, and instances.
   - Use BVH or coarse colliders for dense static geometry when measured raycasting exceeds the
     interaction budget. Use GPU ID picking only with an explicit readback and latency policy.
7. **Review WebGPU, WebXR, and recovery.**
   - Feature-detect after the owning initialization point and retain a tested WebGL fallback unless
     deployment evidence permits otherwise. Browser name alone does not prove adapter, feature,
     limit, driver, policy, or secure-context support.
   - Treat WebGL context loss and WebGPU device loss as lifecycle transitions with resource rebuild
     or a deliberate user-visible fallback, not only console errors.
   - For WebXR, separate target-ray, grip, hand, gaze, and near-touch interaction; keep session
     request, permission failure, end, re-entry, camera, and frame-loop behavior explicit.
8. **Verify behavior and performance.**
   - Test initial load, resize, background-tab return, route remount, asset replacement, fallback,
     loss/recovery where supported, and representative pointer/XR interaction.
   - Compare before/after CPU frame time, GPU frame time when measurable, draw calls, triangles,
     texture and geometry counts, shader compilation, upload stalls, and render-target pixels on a
     representative device. Do not call a change an optimization from source inspection alone.

<!-- mustflow-section: postconditions -->
## Postconditions

- Renderer, scene, frame loop, resources, interaction, and fallback each have an explicit owner.
- Release status, renderer backend, feature status, and browser support are not collapsed into one
  generic "current Three.js" claim.
- Picking maps render intersections to domain semantics and has bounded per-event work.
- Performance claims include counters or traces and repeated lifecycle operations do not leak.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot intents that cover the changed scope:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the installed Three.js track or browser target is unclear, preserve the existing API and
  fallback and report the missing evidence.
- If GPU timing is unavailable, report CPU timing and renderer counters separately and do not infer
  GPU improvement from them.
- If a renderer migration crosses unsupported shaders, passes, formats, or platform features, keep
  the existing backend and report the smallest migration experiment instead of forcing parity.
- If verification needs an unconfigured server, browser harness, asset generator, or benchmark,
  report the missing command intent rather than running it raw.

<!-- mustflow-section: output-format -->
## Output Format

- Three.js surface and version/backend tracks
- Renderer, scene, resource, and interaction owners
- Compatibility, fallback, migration, and recovery decisions
- Performance evidence before and after
- Changed files and command intents run
- Skipped checks and remaining rendering, lifecycle, picking, or device risk

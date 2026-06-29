---
mustflow_doc: skill.babylon-code-change
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: babylon-code-change
description: Apply this skill when Babylon.js, WebGPU or WebGL engine setup, Scene lifecycle, cameras, lights, meshes, materials, textures, shaders, glTF or GLB loading, AssetContainer usage, loaders, Havok or Physics V2, LOD, instancing, thin instances, picking, render loops, Inspector debugging, or Babylon-related tests are created, changed, reviewed, or upgraded.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.babylon-code-change
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

# Babylon Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve Babylon.js engine, Scene, render loop, asset pipeline, material, physics, lifecycle,
memory, and large-scene performance contracts while making focused web 3D changes.

Babylon work is not ordinary frontend canvas work. Many failures come from treating WebGPU as an
automatic speed switch, leaving WebGL fallback undefined, loading every asset directly into the
Scene, using visual meshes as physics shapes, keeping every object pickable, mutating material
defines at runtime, or disposing meshes without owning materials, textures, observers, and render
loops.

<!-- mustflow-section: use-when -->
## Use When

- Babylon.js engine setup, `Engine`, `WebGPUEngine`, `EngineFactory`, canvas bootstrapping,
  resize handling, render loops, scene creation, cameras, lights, shadows, render targets,
  post-processes, frame graph, Inspector, Playground reproductions, or WebXR setup changes.
- Meshes, `TransformNode`, instances, thin instances, LOD, octrees, occlusion queries, picking,
  pointer interactions, collision, culling, large-world or geospatial rendering, Gaussian splats,
  particles, or tile/chunk streaming change.
- Materials, PBR/OpenPBR, clear coat, refraction, transparency, OIT, KTX2, environment maps,
  shaders, WGSL/GLSL, material plugins, shader compilation, or material dirty behavior changes.
- glTF/GLB import, module-level loader functions, dynamic loader registration, decoder deployment,
  `AssetContainer`, `instantiateModelsToScene`, Draco, Meshopt, KTX2, progressive loading, skins,
  animation retargeting, or asset pipeline docs/tests change.
- Physics V2, Havok, rigid bodies, shapes, aggregates, motion types, pre-step, forces, impulses,
  thin-instance physics, collision callbacks, raycasts, shape casts, or physics tests change.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The change is framework-free TypeScript, JavaScript, HTML, CSS, React, Vue, Svelte, or Astro with
  no Babylon engine, canvas, asset, rendering, physics, or 3D lifecycle boundary.
- The task only edits static 3D assets, textures, or design prose without changing Babylon code,
  loading behavior, rendering configuration, or package metadata.
- Three.js, PlayCanvas, Godot, Unity, Bevy, raw WebGPU, or another renderer owns the boundary; use
  the matching renderer, language, or asset skill instead.
- The task only asks whether an exact Babylon release number is current; use source-freshness
  guidance unless Babylon code or durable skill text changes too.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Package and runtime evidence: nearest package metadata, lockfile, package manager, bundler,
  TypeScript config, target browsers/devices, framework integration, test setup, and CI signals.
- Effective Babylon support range: installed or declared `@babylonjs/core`, loaders, serializers,
  GUI, materials, inspector, Havok, WebGPU, WebXR, and related packages or CDN URLs.
- Engine ledger: WebGPU/WebGL selection, async initialization, fallback policy, canvas ownership,
  render loop owner, resize owner, context-lost policy, feature detection, and target adapters.
- Scene ledger: Scene lifetime, cameras, render targets, lights, shadows, post-processes, active
  mesh evaluation, render groups, observables, pointer picking, debug/Inspector hooks, and disposal
  owner.
- Asset ledger: glTF/GLB source, loader registration, decoder hosting, compression extensions,
  KTX2 policy, `AssetContainer` cache, instantiation plan, skin/skeleton usage, and CDN/range
  request behavior when progressive assets are used.
- Performance ledger: expected object counts, draw calls, active mesh evaluation, GPU frame time,
  render target time, shader compile time, physics time, texture memory, profiler counters, and
  target-device evidence when performance is claimed.
- Physics ledger: Havok initialization, body/shape/material ownership, motion types, collision
  filtering, pre-step use, force versus impulse, callback cost, raycast result reuse, and shape
  complexity.
- Configured verification intents for lint, build, tests, docs, package, and mustflow checks.

<!-- mustflow-section: preconditions -->
## Preconditions

- Identify the Babylon package family and supported version range before using current APIs,
  migration guidance, Frame Graph, WebGPU non compatibility mode, module-level loader functions,
  Physics V2/Havok, or newly released rendering features.
- Refresh official Babylon docs, release notes, typedoc, Khronos glTF specs, browser compatibility
  tables, or package metadata before embedding exact "latest", browser-support, or release-date
  claims. Do not treat this skill as a live version source.
- Determine whether the project is an app, product viewer, game, editor, geospatial/digital-twin
  viewer, library, reusable component, or asset pipeline before changing engine, loader, package,
  or performance surfaces.
- Apply framework-specific skills alongside this skill when React, Vue, Svelte, Astro, Nuxt,
  routing, SSR, hydration, or component lifecycle owns the canvas mount/unmount boundary.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Make focused Babylon source, test, package metadata, docs, template, and configuration edits
  directly required by the requested change.
- Add or update tests when they protect engine selection, WebGPU fallback, render loop cleanup,
  loader registration, asset ownership, disposal, physics behavior, or package compatibility.
- Keep fallback, compatibility, and older API paths when the app or package still supports
  browsers, devices, or Babylon versions where the newer path is unavailable.
- Do not switch a project from WebGL to WebGPU-only, remove fallback, enable WebGPU fast paths,
  enable expensive rendering features, replace physics backends, or move asset hosting unless the
  task and repository contract explicitly support that change.

<!-- mustflow-section: procedure -->
## Procedure

1. **Classify the Babylon surface.**
   - Identify whether the patch touches engine startup, framework integration, scene graph,
     lighting, materials, shaders, asset loading, physics, interaction, performance, docs, tests,
     package metadata, or release-sensitive templates.
   - For reusable packages, treat engine factory options, component props, asset URLs, loader
     expectations, peer ranges, emitted events, and cleanup behavior as public contracts.
2. **Check version, package, and import boundaries.**
   - Read Babylon package versions and import style before using module-level loader functions,
     side-effect imports, WebGPU APIs, Physics V2, Inspector, GUI, serializers, or addon packages.
   - Prefer module-level loader functions such as asset-container and scene load helpers when the
     project already uses ESM tree-shaking. Avoid importing all loaders or legacy barrels unless
     the package size contract allows it.
   - Verify required side-effect imports for loaders, physics, ray picking, occlusion, inspector,
     or scene extensions. IDE type visibility does not prove the production bundle registers the
     runtime behavior.
3. **Review engine setup and fallback.**
   - Treat WebGPU initialization as asynchronous. Do not build scenes, attach resize handlers,
     start render loops, open Inspector, initialize XR, or load assets before the selected engine is
     ready.
   - Preserve WebGL fallback unless project evidence proves WebGPU-only deployment is intentional.
     Browser support tables do not guarantee the user's OS, GPU, driver, secure context, adapter,
     or blocked-device list supports the needed features.
   - Distinguish WebGPU compatibility mode concepts from Babylon's engine `compatibilityMode`.
     Babylon non compatibility mode should be enabled only when material, skeleton, shadow, vertex
     buffer, and global state are stable enough to reuse bundles.
   - If WebGPU fast paths are used, inspect bundle creation counters and repeated material or
     buffer dirtiness instead of assuming WebGPU is faster.
4. **Own render loop and scene lifecycle.**
   - Keep engine, scene, canvas, render loop, resize, observers, debug panels, and route/component
     mount lifetimes explicit.
   - Make render-loop registration idempotent. Avoid starting another `runRenderLoop` on every
     framework remount, hot reload, tab reactivation, or route change.
   - Dispose scenes, containers, observers, custom event listeners, render targets, materials,
     textures, physics bodies, and caches according to an ownership ledger. `mesh.dispose()` alone
     rarely proves memory cleanup.
   - Decide whether WebGL context-loss recovery is required before changing `doNotHandleContextLost`.
     Disabling recovery saves memory only by moving recovery responsibility to the app.
5. **Review Scene structure by cost owner.**
   - Use `TransformNode` for non-rendering parents, anchors, glTF roots, tile roots, rig parents,
     and effect pivots. Do not use empty meshes as folders.
   - Keep cameras, render targets, mirrors, minimaps, portals, thumbnails, shadows, and post-process
     passes visible in the cost model. Another camera or render target often means drawing the scene
     again.
   - Keep static meshes and materials marked static only when their transforms and shader defines
     will not change. `freezeWorldMatrix`, `material.freeze`, and `freezeActiveMeshes` are
     contracts, not generic speed buttons.
6. **Review lights, shadows, and post-processing.**
   - Treat clustered lighting as a way to reduce light evaluation cost, not as permission to enable
     unlimited real-time shadows.
   - Limit shadow generators to lights and objects that need dynamic shadows. Keep directional
     shadow frustums, min/max Z, ortho scale, map size, cascades, and refresh rate deliberate.
   - Gate volumetrics, glow, SSAO, outline, dynamic IBL shadows, area lights, textured area lights,
     splats, particles, and HTML-in-Canvas by target device and frame budget.
7. **Review materials, textures, shaders, and transparency.**
   - Do not use full PBR, clear coat, glass, subsurface, refraction, transparency, OIT, or expensive
     post-processes on every object by default. Assign expensive features to hero surfaces.
   - Treat PNG, JPG, and WebP as transfer formats, not GPU memory optimization. Use KTX2/Basis
     policies when VRAM and texture upload are the real bottlenecks.
   - Choose KTX2 modes by texture class. Avoid applying ETC1S blindly to normal, metallic,
     roughness, or other non-color data where UASTC or another policy is needed.
   - Prefer prefiltered environment textures for release builds instead of runtime HDR/EXR
     prefilter work unless startup cost is acceptable.
   - Avoid runtime material define churn. Use uniforms for value changes, prebuilt variants for
     structural changes, preload shader compilation for important materials, and restore
     `scene.blockMaterialDirtyMechanism` after batched edits.
   - For WebGPU custom shaders, check WGSL, GLSL conversion, sampler binding, attribute lists,
     texture array restrictions, viewport bounds, and unsupported texture formats.
8. **Review glTF and asset loading.**
   - Prefer `LoadAssetContainerAsync` when the code needs delayed attachment, pooling, cloning,
     repeated instantiation, route-level ownership, or predictable cleanup.
   - Do not treat `loadedMeshes[0]` as the first visual mesh for glTF. Account for the loader-added
     root node before measuring bounds, assigning materials, adding collisions, or changing pivots.
   - Treat Draco, Meshopt, KTX2, and progressive GLB as runtime contracts, not only export flags.
     Check decoder hosting, CSP/offline constraints, workers, CPU decode time, CDN cache keys, and
     HTTP range support.
   - For skins and animation retargeting, check skeleton nodes, linked bone transforms, reference
     pose, root motion, scale, socket ownership, and whether code mutates the linked transform node
     rather than a transient bone value.
9. **Review LOD, culling, instances, and large scenes.**
   - Start with instrumentation: active mesh evaluation, draw calls, GPU frame time, render target
     time, shader compile time, and physics time. Do not add LOD or occlusion blindly.
   - Split large worlds into cells, chunks, tiles, sectors, or streaming roots with separate
     bounding, LOD, loading, disposal, and interaction ownership.
   - Use regular instances when per-instance object control matters. Use thin instances for large,
     mostly static repeated objects with deliberate buffer and bounding design.
   - Build thin-instance buffers in bulk, update only changed ranges when possible, and avoid
     rebuilding `Float32Array` or GPU buffers every frame.
   - Keep thin-instance roots spatially chunked. One visible instance should not keep an entire
     forest, city, or catalog alive.
   - Separate positive and negative determinant instance batches. Mirrored transforms can break
     batching or rendering assumptions.
   - Choose culling strategies per mesh class. Sphere-only, standard, and optimistic strategies
     trade CPU precision against false-positive GPU work.
   - Use occlusion queries only for large expensive objects where asynchronous, delayed visibility
     decisions and rendering group ordering are acceptable.
10. **Review picking, interaction, and per-frame allocation.**
    - Keep only interactive meshes pickable. Disable pointer move picking when hover behavior is not
      needed, and prefer proxy interaction layers for dense models.
    - Avoid creating math objects, arrays, matrices, colors, raycast results, or thin-instance
      buffers inside hot render loops. Reuse `TmpVectors`, `copyFrom`, `set`, mutable refs, and
      preallocated arrays where the code path is per-frame.
    - Keep pointer actions, observables, callbacks, and external event buses removable and scoped to
      the owning scene or component.
11. **Review Physics V2 and Havok boundaries.**
    - Use Physics V2 concepts: body, shape, material, aggregate, constraint, and motion type are
      separate design decisions.
    - Initialize Havok and plugin state explicitly, including WASM/package deployment. Do not assume
      a JavaScript import alone wires every physics extension in a tree-shaken bundle.
    - Use simple shapes, convex hulls, or compounds for dynamic bodies. Reserve mesh shapes for
      static terrain or static concave geometry where the triangle cost is acceptable.
    - Reuse shapes for repeated bodies when appropriate. Do not treat `PhysicsAggregate` convenience
      as an object-pool or native-memory strategy.
    - Choose static, dynamic, and animated motion types by intent. Do not fight the physics engine
      by directly transforming dynamic bodies every frame.
    - Enable pre-step only for the bodies and frames that must sync node transforms into physics.
    - Use impulses for instantaneous events and forces for continuous effects. Do not encode game
      state in sleep status.
    - Keep collision callbacks lightweight and filtered. Prefer world-level callbacks with
      filtering when that is the cheaper design. Reuse raycast result objects and masks.
12. **Keep public and package surfaces synchronized.**
    - If engine selection, asset loading, material behavior, physics behavior, component props,
      browser support, package ranges, or performance claims change, synchronize docs, examples,
      tests, and package metadata.
    - Avoid exact latest-version wording unless official sources were refreshed in the current task.
      Prefer support-range wording such as "Babylon.js 9.x" only when the project actually supports
      that range.
13. **Verify through the repository contract.**
    - Run the smallest configured checks that cover Babylon code, package output, docs, tests, and
      release-sensitive template output.
    - Report missing browser, WebGPU/WebGL, target-device, visual, physics, asset-pipeline,
      memory-leak, WebXR, Inspector, profiler, or package-consumer verification when those surfaces
      changed.

<!-- mustflow-section: postconditions -->
## Postconditions

- Effective Babylon package, browser, engine, loader, asset, and physics compatibility are known or
  explicitly reported as unknown.
- Engine initialization, render loop ownership, scene lifecycle, observer cleanup, disposal, and
  context-loss behavior are intentional.
- Asset loading, decoder hosting, compression, material, shader, LOD, culling, instancing, picking,
  and physics choices match the target scale and device budget.
- Performance claims have instrumentation, profiler, benchmark, target-device, frame-time, memory,
  or configured evidence, or are reported as static risk.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Report missing Babylon browser smoke, WebGPU/WebGL fallback, visual regression, target-device
profiling, asset decoder, glTF/GLB loading, WebXR, physics, memory/disposal, Inspector, or package
consumer verification when those surfaces changed.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If WebGPU behavior fails, separate async engine readiness, feature support, fallback selection,
  shader binding, texture format, viewport bounds, bundle churn, and custom shader conversion
  before reverting to broad renderer changes.
- If a model loads incorrectly, inspect loader registration, root node handling, decoder hosting,
  compression extension support, skeleton linked nodes, material slots, texture URLs, and CDN/range
  behavior before changing unrelated scene code.
- If frame time regresses, identify whether the bottleneck is active mesh evaluation, draw calls,
  shader compile, material dirty, fill rate, render targets, shadows, post-processes, picking,
  physics, or GC before adding generic optimizations.
- If memory grows, inspect ownership of containers, meshes, materials, textures, render targets,
  observers, event listeners, physics bodies, caches, context-lost recovery, and framework remounts.
- If physics behavior is unstable, inspect shape complexity, motion type, pre-step, transform
  ownership, collision filtering, callback work, and force versus impulse use.
- If official source freshness cannot be checked for a version, browser, release, or API claim,
  omit the claim from durable skill text and report it as unverified snapshot context.

<!-- mustflow-section: output-format -->
## Output Format

- Babylon surface and supported version checked
- Engine, WebGPU/WebGL fallback, render loop, Scene lifecycle, disposal, context-loss, and
  observer notes
- Asset loading, glTF/GLB, decoder, compression, material, shader, texture, transparency, and
  environment notes
- LOD, culling, instancing, thin-instance, picking, large-scene, physics, Havok, and performance
  notes
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining Babylon, WebGPU/WebGL, asset, physics, performance, or verification risk

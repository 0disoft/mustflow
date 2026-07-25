# Asset Contract and Validation Ledger

Use this reference to turn a visual request into project-owned inputs and observable acceptance
evidence. Values below are fields to decide, not Mustflow defaults.

## Contract fields

Record the fields that apply to the selected asset role:

| Area | Contract fields |
| --- | --- |
| identity | asset ID, role, variant family, master source, replacement tier |
| geometry | canvas, intended occupied bounds, target display sizes, pixels per unit, world dimensions, projection, camera, horizon or ground line |
| presentation | palette, value bands, outline range, material simplification, light vector, shadow policy, allowed baked lighting |
| transparency | straight or premultiplied delivery, cutout or soft alpha, background model, matte policy, color dilation policy |
| alignment | root pivot, ground contact, center of mass, sockets, trim policy, untrimmed source size |
| gameplay | movement collider, hurtbox, hitbox, interaction region, occluder, z-sort anchor, event frames |
| texture | color space, bit depth, filter, mipmap, wrap, compression, atlas rotation, extrude, shape padding, border padding |
| lifecycle | raw source owner, editable master, derived output, generator version, transform version, reviewer, replacement map |

For perspective or isometric work, also record screen directions for world axes and the expected
projection of a calibration cube. A style name such as "isometric" or "three-quarter" is not a
projection contract.

## Provenance and replacement ledger

Keep provenance evidence separate from visual approval:

- exact provider, model, checkpoint, adapter, VAE, pose or control input, and post-processor versions;
- account or license context needed by the project, captured at the generation date when required;
- source URL or file identity, hash, author or owner, license or permission, attribution, and use scope
  for every reference input;
- prompt or prompt hash, seed when meaningful, settings hash, generation date, and immutable raw hash;
- human-authored blockout, silhouette, composition, paintover, palette, rig, frame alignment, and
  gameplay metadata contributions;
- similarity, watermark, logo, trademark, platform disclosure, and human-review disposition;
- final file hash and every game, atlas, UI, store, marketing, and localization reference that must be
  changed during quarantine or replacement.

Do not collapse provider permission, copyright ownership, non-infringement, and exclusivity into one
"commercial use" boolean. Time-sensitive legal, vendor, and platform claims require current
authoritative sources; this ledger records evidence and decisions but does not supply legal advice.

## Metric contract

Every automated metric should declare:

| Field | Question |
| --- | --- |
| metric ID | What stable name identifies the rule? |
| asset roles | Which cutout, effect, tile, icon, frame, or atlas roles does it apply to? |
| coordinate space | Source pixels, target pixels, normalized canvas, world units, UVs, or color space? |
| sampling stage | Raw, work, resized, packed, compressed, imported, or rendered? |
| threshold | What exact bound causes pass, warning, review, quarantine, or rejection? |
| source | Project contract, engine rule, representative approved set, or measured runtime budget? |
| exception | Which intentional edge-touch, full-canvas effect, soft-alpha, or asymmetric pose is exempt? |
| evidence | Which report, image, contact sheet, metadata record, or engine scene proves the result? |
| action | Rework, quarantine, reject, or revise the contract with new evidence? |

## Required metric families

Select only the families relevant to the asset role:

- file contract: exact canvas, color mode, RGBA presence, bit depth, color profile, byte budget, empty
  output, duplicate hash, naming, and metadata completeness;
- alpha contract: corner and border alpha, border-connected background residue, low-alpha noise area,
  alpha histogram, matte fringe on contrasting backgrounds, and hidden RGB policy;
- framing contract: occupied bounds, border contact, safe margin, ground contact, pivot, sockets,
  source size, trim rectangle, and sprite-source position;
- icon contract: silhouette occupancy, minimum negative space, minimum stroke, connected-component
  count, contrast, pixel-grid alignment, and size-specific detail budget;
- seam contract: opposite-edge color and gradient distance, corner closure, repeated-pattern peak,
  topology validity, object-contact height, and worst-neighbor matrix;
- animation contract: root and pivot drift, support-foot world drift, silhouette-area change, landmark
  and bone-length change, palette drift, motion-arc deviation, loop pose and velocity discontinuity,
  optical-flow outliers, and event-frame completeness;
- runtime contract: atlas bleed, UV region, alpha blend agreement, filter and mipmap behavior, wrap,
  compression artifacts, draw scale, pixel snap, import metadata, and engine-scene result.

## Threshold calibration

Exact values belong to the project because a 16-pixel icon, a 256-pixel painted sprite, and a
full-canvas smoke effect cannot share one tolerance. Calibrate from target-size approved examples and
known-bad fixtures.

Useful starting hypotheses from the supplied production material include exact alpha zero at isolated
cutout corners, no unintended occupied border pixel, pivot or grounded-foot drift no greater than one
target pixel, silhouette-height drift around two percent, and light-direction drift around five
degrees. These are calibration candidates only. Record the tested scale and replace them with the
project's measured bounds before using them as release gates.

If no approved baseline or engine evidence exists, emit measurements and contact sheets as a
calibration report. Do not silently turn an arbitrary number into a pass or fail contract.

## Acceptance matrix

Render or inspect at least:

- transparent cutouts on black, white, mid-gray, and saturated backgrounds;
- icons at every shipped optical size, not only a large master preview;
- tiles as same-tile repeats and worst valid neighbors, including all four corners;
- sprites at native, reduced, and enlarged scales with the shipped filter and mipmap policy;
- atlases before and after compression with adjacent high-contrast sprites;
- animation at intended frame durations, slow inspection speed, and the loop boundary;
- debug overlays for pivot, ground line, sockets, trim rectangle, collider, hurtbox, hitbox, occluder,
  motion paths, light vector, and tile topology.

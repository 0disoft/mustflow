# Tile, Background, Object, and Animation Checklist

Use this checklist when assets must join a shared world or form a stable animation instead of merely
looking related in isolation.

## Tile and background continuity

- Contract tile size, pixels per unit, projection, world-axis screen directions, horizon or ground
  line, light vector, outline, palette, detail frequency, edge-lock width, and shadow policy.
- Generate a new object inside a representative scene or from locked geometry and lighting guides,
  then extract the deliverable. A transparent isolated generation has no evidence that it belongs to
  the world's scale or contact plane.
- For two large images, establish one shared seam band and outpaint away from it. Do not generate both
  sides independently and expect prompt wording to repair incompatible geometry.
- For repeatable textures, offset opposite edges into the center, repair the crossed seam, restore the
  image, and inspect a repeated grid including all corner meetings.
- Define terrain topology and masks before surface generation. Edge or corner codes, legal neighbor
  sets, and transition masks belong to code or data; the generator supplies material appearance.
- Separate base materials, transition masks, and decorative overlays so a palette or material change
  does not require regenerating every transition tile.
- Compare low-frequency value masses and high-frequency detail density separately. Matching average
  color cannot repair incompatible feature scale.
- Generate parallax layers independently with common horizon and vanishing-point constraints, enough
  hidden overlap for the full camera range, and low-information cut boundaries.
- Test same-tile repeats, every valid worst neighbor, randomized maps, multiple zooms, filters,
  mipmaps, packing, and compression in the actual renderer.

## Object contact and world ownership

- Keep long cast shadows out of reusable object color unless the game is fully baked to one lighting
  contract. Separate contact shadow, cast-shadow mask, occluder, emissive, normal, and depth layers as
  needed.
- Use terrain-specific contact patches such as grass overlap, soil roots, snow compression, or water
  ripple instead of regenerating the full object for every surface.
- Align by semantic world anchors such as ground center, feet, wheel contact, hinge, grip, muzzle, or
  center of mass. Alpha-bounds center is not a stable pivot for hats, weapons, tails, or asymmetric
  effects.
- Keep movement collision, hurtbox, hitbox, interaction region, projectile blocker, navigation
  footprint, z-sort point, and occluder as separate gameplay roles. Decorative alpha is a skin, not a
  universal collider generator.

## Character identity and directional sets

- Approve a reference package containing front, side, back, representative action, palette, body
  landmarks, equipment handedness, smallest-size render, and neutral root position.
- Generate each frame from the approved package and pose or geometry guide, not from only the previous
  generated frame. Assemble the sheet after frame validation.
- For four- or eight-direction sets, keep camera and body measurements common while explicitly
  tracking left/right equipment, text, scars, asymmetrical costume, lighting, and weapon attachment.
  Mirror only components whose contract permits mirroring.
- Track joints, parent-child relationships, nominal bone lengths, joint ranges, silhouette landmarks,
  and allowed deformable regions. Report occluded or low-confidence landmarks instead of fabricating
  a precise skeleton measurement.

## Motion construction

- Build locomotion from meaningful phases such as contact, down, passing, up, and flight where
  applicable. More evenly spaced frames do not fix a missing weight transfer.
- During support contact, compare the planted foot in world coordinates after root motion. Measure
  support-foot drift separately from intentional body translation.
- Assign durations by action: anticipation, pre-impact hold, impact, follow-through, overshoot, and
  recovery often need unequal time. Store duration per frame instead of assuming a uniform sheet FPS.
- Track hands, feet, head, center of mass, weapon tip, and other action points along expected arcs.
  Uniform straight interpolation between poses is not motion evidence.
- Attach a weapon through a grip anchor and local weapon coordinate system; track wrist rotation,
  weapon length, tip path, and hit event separately from generated hand pixels.
- Define squash, stretch, overshoot, and follow-through limits per body region. Preserve identity by
  fixing regions whose proportions or equipment geometry must not change.

## Loop and gameplay metadata

- Compare the last-to-first boundary for root position, joint rotation, silhouette, color, motion
  direction, velocity, and acceleration. Do not duplicate the first frame at the end merely to hide
  the boundary.
- Preserve original frame size, trim rectangle, sprite-source position, pivot, sockets, ground
  contact, frame duration, loop range, event frames, hitbox, hurtbox, attack shape, and collision
  profile in the atlas or adjacent metadata.
- Keep movement collider and root hurtbox stable across frames unless gameplay explicitly changes
  them. Drive attacks, invulnerability, sounds, particles, and movement impulses from named events,
  not from guessed image differences.

## Automated animation evidence

Measure at the target display scale and in world space where applicable:

- silhouette area, height, and centroid variation;
- root, pivot, ground-contact, and socket drift;
- joint position, bone length, joint-range, handedness, and equipment-attachment violations;
- support-foot world drift during planted intervals;
- palette or regional color drift and face or costume identity outliers;
- motion-arc residual for hands, feet, center of mass, and weapon tip;
- optical-flow outliers after compensating declared root motion;
- last-to-first pose, velocity, and acceleration discontinuity;
- metadata completeness for timing, loop, events, pivots, and gameplay shapes.

Automatic scores triage candidates; they do not prove anatomy, intent, copyright status, or visual
quality. Review metric outliers in contact sheets and the engine scene, then accept, rework,
quarantine, or reject them under the project contract.

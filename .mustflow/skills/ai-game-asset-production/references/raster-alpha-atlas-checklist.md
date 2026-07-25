# Raster, Alpha, Icon, and Atlas Checklist

Use this checklist for isolated PNGs, translucent effects, icons, frame extraction, trimming, resizing,
packing, and engine import. Verify exact engine-version options from current project files or official
documentation before naming a setting.

## Real transparency

1. Decode the file and inspect its actual channel layout; a PNG extension or visible checkerboard is
   not proof of an alpha channel.
2. For an isolated cutout, require the contract's corner and border alpha. Do not apply the same rule
   to full-canvas fog, light, edge effects, or intentionally edge-touching tiles.
3. Inspect the alpha histogram and border-connected low-alpha regions. A large faint background can
   pass a four-corner test, while a legitimate soft effect can have many distinct alpha values.
4. Detect baked checkerboards as image content by looking for repeated alternating blocks in opaque
   or near-opaque background regions; route suspicious cases to review instead of claiming a perfect
   detector.
5. Composite the decoded image on dark, light, neutral, and saturated backgrounds at target size.
   Measure the edge band as well as reviewing it visually.

## Straight and premultiplied alpha

- Record whether working images, resize operations, packed textures, renderer uploads, and blend
  equations expect straight or premultiplied alpha.
- For color resampling, convert color to the correct linear-light working space when required,
  premultiply RGB by alpha, resize color and alpha together, and unpremultiply only when the output
  contract requires straight alpha. Protect alpha zero from division noise.
- A white, black, or gray halo usually means a matte color was mixed into antialiased pixels, hidden
  transparent RGB entered filtering, or straight data was blended as premultiplied data or vice versa.
- Normal, roughness, ID, and mask textures are data, not display color. Do not apply sRGB color
  transforms or color-image alpha repair to them without an explicit format rule.

## Hidden RGB policy

Choose by runtime behavior:

- Clear RGB under alpha zero only for pipelines that never sample beyond visible texels and whose
  compression or tooling contract requires canonical transparent bytes.
- Extend nearby visible color into transparent texels for linearly filtered, resized, mipmapped, or
  atlased color sprites. Use nearest visible color or bounded edge dilation without changing alpha.
- Keep cutout-color dilation distinct from soft-effect matting. Smoke, glass, fire, glow, and hair
  need foreground color and fractional alpha recovered together; hard thresholding deletes the
  effect or leaves a matte.

## Multi-object separation

For a sheet containing several generated objects:

1. Estimate foreground alpha or foreground probability, preserving a soft channel for effects.
2. Remove border-connected background residue and isolated components below a role-specific area
   threshold.
3. Run connected-component analysis at more than one alpha threshold so faint shadows and solid
   objects can be reasoned about separately.
4. Merge components only with semantic evidence such as a declared object group, containment,
   proximity, shared anchor, or source mask. A detached weapon decoration may belong to the object;
   smoke or a ground glow may require a separate blend layer.
5. Split touching candidates with masks, contour concavities, watershed or distance fields, and a
   review fallback. Do not slice solely through the narrowest pixel column.
6. Dilate the accepted mask only enough to preserve antialiasing, then compute a safety margin and
   reject any crop that touches the output border outside an intentional exception.
7. Store the source image, extraction mask, component membership, original bounds, expanded bounds,
   and confidence or review disposition.

## Icons and optical sizes

- Do not downsample one detailed master into every size and call the result complete. Treat 16, 24,
  32, 64, 128, and larger outputs as optical-size families selected by the product, not as a mandatory
  Mustflow size list.
- At the smallest sizes, prioritize silhouette, negative space, one dominant feature, strong value
  separation, grid-aligned edges, and strokes that survive the target raster.
- Add secondary forms and material detail only as the target size can resolve them. Measure the final
  raster rather than trusting a large preview.
- Generate each size from the largest approved source or a size-specific master in one resampling
  step, then perform final-size cleanup. Do not repeatedly resize from the previous smaller output.

## Trimming and atlas metadata

Trimming may remove transparent storage but must not erase placement:

- original source width and height;
- trimmed frame rectangle in the original canvas;
- sprite-source position or corner offset;
- pivot in normalized and source-pixel coordinates when useful;
- ground contact, center of mass, sockets, and semantic anchors;
- frame duration, loop range, animation event references, and gameplay shape references;
- atlas frame rectangle, rotation flag, extrude, shape padding, border padding, and page identity.

Apply identical trim and placement to paired color, normal, emissive, and mask textures. Disable atlas
rotation when direction, UI orientation, tiling, paired maps, or local axes make rotation unsafe.

## Bleeding and engine import

- Transparent gaps alone do not stop sampling. Keep extruded edge color, spacing between packed
  shapes, and atlas-border padding as separate values derived from filtering, mip depth, compression,
  and maximum reduction.
- Do not use UV inset as the only repair; it can shrink or shimmer sprites and still fails at deeper
  mips. Verify the packed result with deliberately high-contrast neighbors.
- Use clamp for independent sprites and repeat only for textures whose opposite edges are contracted
  to repeat. Select nearest or linear filtering from the asset role and camera behavior; pixel art may
  still need a deliberate mip strategy when heavily minified.
- For PixiJS, verify the installed renderer version's texture source, alpha, scale, mipmap, wrap, UV,
  resolution, and atlas metadata behavior rather than copying properties from another major version.
- For Unity, verify sprite import mode, pixels per unit, pivot, mesh, filter, mipmaps, color space,
  alpha handling, compression, atlas padding or extrude, rotation, and paired texture behavior.
- For Godot, verify texture import filtering, mipmaps, repeat, alpha-border repair, lossless or VRAM
  compression, normal-map handling, region filtering, SpriteFrames metadata, offset, and pixel-snap
  behavior for the installed major version.
- Compare the source, packed texture, imported resource, and rendered frame. Disk compression size is
  not GPU-memory evidence.

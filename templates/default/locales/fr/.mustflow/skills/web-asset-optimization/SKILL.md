---
mustflow_doc: skill.web-asset-optimization
locale: fr
canonical: false
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: web-asset-optimization
description: Apply this skill when adding, converting, resizing, replacing, or reviewing raster image assets for websites or web applications.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.web-asset-optimization
  command_intents:
    - asset_optimize
    - build
---

# Web Asset Optimization

<!-- mustflow-section: purpose -->
## Purpose

Keep web image assets small, format-appropriate, and correctly referenced without inventing an image pipeline for the project.

<!-- mustflow-section: use-when -->
## Use When

- A generated PNG, JPEG, WebP, AVIF, GIF, or other raster image is added to a website or web app.
- An existing web image is replaced, resized, compressed, or converted.
- A page, component, stylesheet, or metadata file changes image references.
- A user asks to reduce image size, convert to WebP or AVIF, or prepare generated images for production use.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The asset is a vector source such as SVG, icon font, or design-token file.
- The image is an archival, print, source, or evidence artifact where preserving the original bytes matters more than web delivery size.
- The repository already has a more specific media, design-system, or framework asset procedure.
- The task is only to generate a new image and not to install or reference it in the repository.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The image file paths and their current or intended references.
- The expected display size, transparency needs, animation needs, and quality requirements.
- Existing framework image conventions, static asset folders, and import style.
- `.mustflow/config/commands.toml` entries for `asset_optimize` and `build`.

<!-- mustflow-section: preconditions -->
## Preconditions

- La tache correspond aux conditions d'utilisation et ne correspond pas aux exclusions.
- Les entrees requises sont disponibles, ou les entrees manquantes peuvent etre signalees sans supposition.
- Les instructions de priorite superieure et `.mustflow/config/commands.toml` ont ete verifiees pour le perimetre actuel.

<!-- mustflow-section: allowed-edits -->
## Modifications Autorisees

- Garder les modifications dans le perimetre decrit par cette skill, la demande utilisateur et la route correspondante dans `.mustflow/skills/INDEX.md`.
- Ne pas elargir les permissions de commande, inventer des faits projet ou modifier des fichiers de workflow sans rapport.

<!-- mustflow-section: procedure -->
## Procedure

1. Identify every changed image asset and every page, component, style, metadata, or manifest reference that depends on it.
2. Check the original file size, dimensions, format, transparency, and animation before changing the asset.
3. Prefer the repository's existing image pipeline, framework image component, or configured `asset_optimize` intent when one exists.
4. Do not add a new dependency, online service, or ad hoc conversion tool unless the user explicitly approves it or the repository already uses it.
5. Choose the output format based on actual needs: WebP or AVIF for most photographic and generated bitmap website assets, PNG when lossless transparency or exact pixels matter, and SVG only for real vector artwork.
6. Keep source and derived assets separate when the repository already has that convention. Otherwise, avoid adding duplicate originals unless future editing requires them.
7. Update imports, static paths, metadata references, dimensions, and cache-sensitive filenames according to the local style.
8. Compare before and after file sizes and note any quality, transparency, animation, browser-support, or fallback tradeoff.

<!-- mustflow-section: postconditions -->
## Postconditions

- La sortie attendue peut etre produite avec preuves claires, intentions de commande executees, verifications ignorees et risques restants.
- Toute intention de commande manquante, entree inconnue ou conflit d'autorite est signale au lieu d'etre cache.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `asset_optimize`
- `build`

Do not infer missing image optimization commands. If `asset_optimize` is unknown, missing, manual-only, or not agent-runnable, report that status and describe the intended optimization without executing an unconfigured tool.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If optimization visibly degrades the image or breaks transparency, restore or keep the better asset and report the tradeoff.
- If image references break, fix the nearest import, path, metadata, or build configuration that owns the reference.
- If the repository lacks an optimization command, propose the smallest project-specific command intent instead of running an external website or guessed package command.
- If the build fails after asset changes, investigate the first asset-related failure before touching unrelated code.

<!-- mustflow-section: output-format -->
## Output Format

- Images reviewed or changed
- Format and size changes
- References updated
- Command intents run
- Skipped command intents and reasons
- Remaining image quality or browser-support risks

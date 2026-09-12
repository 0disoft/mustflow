# Interface skill source notes

This note records the provenance and adoption boundaries for the interface procedures, not executable instructions.

## Input snapshots

Reviewed on 2026-09-12 from two user-supplied archives. Their READMEs identify
Jakub Krehel's interfaces collection and Emil Kowalski's design and animation collection.
No commit identifier or license file was present in either archive. Upstream licensing
and current contents were not verified; the archives are the reviewed snapshots.

| Archive | SHA-256 |
| --- | --- |
| skills1.zip | 0e5b9afaf18c29f40e6758f46410084befd76f3e1f39bf86f8cc97c6acdb927e |
| skills2.zip | 58dab5063ea63d54447266a723882725bcf896aacee1fbfdaaea508c22d1da36 |

The Mustflow procedures are independently written around general design principles.
No third-party skill body, code recipe, helper, asset, plugin manifest, or agent instruction
file is imported. The source names below identify inspiration, not a license grant,
endorsement, or dependency.

## Adoption map

| Reference topics | Mustflow owner | Decision |
| --- | --- | --- |
| better-interface, interface-review, better-ui | ui-quality-gate | Add scoped review baselines, user-impact evidence, and contextual geometry |
| better-accessibility | frontend-accessibility-tree-review | Add hit geometry, user overrides, and transient/modal lifecycle checks |
| better-layout, break | frontend-stress-layout-review | Add bounded real-component fixtures, comparative evidence, and preview lifecycle |
| better-typography | interface-typography-review | New role-based typography, fallback, script, and content-recovery procedure |
| better-colors | interface-color-system-review | New token-role and rendered-pair procedure with measurement limits |
| better-writing | interface-copy-review | New action/state-based microcopy and localization procedure |
| explain-interface | interface-reference-analysis | New observation, derivation, hypothesis, and reconstruction boundaries |
| variant, prototype | interface-variant-exploration | New comparable alternatives and explicit selection/integration lifecycle |
| animate, animation-vocabulary, emil-design-eng, apple-design, find-animation-opportunities, improve-animations, review-animations | motion-system-contract-review | Extend the existing motion owner instead of installing overlapping animation procedures |
| animate-expo | motion-system-contract-review | Retain cross-runtime/thread and gesture considerations; do not import version-specific native APIs |
| pick-ui-library | frontend-component-library-review | Existing owner; do not adopt a vendor ranking or automatic dependency replacement |
| ask-sonner | Existing component, notification, and dependency procedures | Do not import library-specific recipes or privileged operations |
| write-swift | No addition in this intake | Swift language engineering is outside the requested interface-design procedures |

## Decisions that intentionally differ

- Existing project tokens, brand, input methods, language, and supported platforms constrain recommendations.
  Fixed durations, curves, hue distances, font counts, or weights are not universal defect thresholds.
- Transform and opacity are often economical; they are not proof of free rendering or GPU execution.
- Screenshots can inform a reconstruction but cannot recover source colors, CSS units, motion,
  accessibility behavior, or a conformance result without additional evidence.
- Reduced motion may settle instantly. Keyboard input does not automatically prohibit useful feedback.
- Contextual previews do not require modifying shipped routes. Isolated prototypes should still
  represent the actual parent constraints and product content.
- A user may delegate variant selection or request implementation directly. The procedures preserve
  that authority rather than imposing a mandatory approval round.
- External installation instructions, browser launch recipes, production writes, and package preferences
  do not become Mustflow command authority.

## Installation

All five new procedures belong to product and team profiles. Typography, color, and copy also
belong to library. The default minimal profile remains unchanged. Source skills and the English
template are synchronized; other document locales use the canonical skill fallback.

The route fixture corpus checks English and Korean requests, nearby exclusions, unrelated and
empty input, and coexistence with a CSS language procedure. Profile and installation tests check
distribution separately from routing. These checks establish packaging and route behavior, not
measured improvements to a real product's usability.

# docs-site styles

Languages: [English](README.md) · [한국어](../../docs/i18n/ko/src/styles/README.md) · [中文](../../docs/i18n/zh/src/styles/README.md) · [Español](../../docs/i18n/es/src/styles/README.md) · [Français](../../docs/i18n/fr/src/styles/README.md) · [हिन्दी](../../docs/i18n/hi/src/styles/README.md)

This directory hosts the visual style layers for the documentation site. Instead of relying on monolithic UI frameworks, `docs-site` manages its layout, components, and typography using modular, vanilla CSS sheets separated by specialized layout and user interaction concerns.

---

## Load Order & Cascading

The load and compilation order of these stylesheets is strictly defined in `../config/styles.mjs`. When adding new visual rules, ensure they inherit styles predictably along the CSS cascade.

---

## Stylesheet Module Registry

* **`tokens.css`**: The design token engine. Regulates centralized CSS custom properties for color palettes (HSL variables), typography (Inter, Outfit fonts), border radiuses, and spatial grid systems.
* **`layout.css`**: Defines viewport grid metrics, margins, and flex containers for the Starlight core frame (navigation sidebar, content container, header).
* **`markdown.css`**: Manages rich text rendering. Governs styling for tables, paragraphs, custom alerts, blockquotes, inline codes, and syntax-highlighted blocks.
* **`header-controls.css`**: Specifically overrides layouts for navigation header items, including the language switcher dropdown, theme toggle buttons, and search forms.
* **`page-navigation.css`**: Rules for footer pagination links (e.g., Previous Page / Next Page).
* **`interaction.css`**: Controls dynamic micro-animations, active states, hover effects, and text selection overrides for static UI elements like logo marks and navigation links.
* **`accessibility.css`**: The core web accessibility guard. Enforces high-contrast focus rings, custom outline overrides, CSS direction isolation (`unicode-bidi`), and motion-reducing media queries (`prefers-reduced-motion: reduce`).

---

## Design Token Best Practices (`tokens.css`)

Always consume CSS variables instead of hardcoded hex values to support dynamic light and dark theme toggling smoothly:
```css
/* Good Practice */
.my-card {
  background-color: var(--sl-color-bg-inline);
  padding: var(--sl-spacing-md);
}

/* Bad Practice */
.my-card {
  background-color: #1a1a1a;
  padding: 16px;
}
```

---

## Accessibility & Keyboard Controls

Styling changes must respect user settings:
* **Focus States**: High-visibility focus indicators must be retained; do not write `outline: none` unless providing an explicitly equivalent focus selector.
* **Reduced Motion**: Any custom animation, slide effect, or transition must adapt gracefully when the user's OS has disabled motion. Ensure these exceptions are added inside `@media (prefers-reduced-motion: reduce)`.
* **Keyboard Navigation**: Non-CSS interactive states (such as keyboard focus traps) are managed dynamically in `../../public/keyboard-navigation.js` and registered in `../config/head.mjs`.

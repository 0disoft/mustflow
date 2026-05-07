# docs-site styles

Languages: [English](README.md) · [한국어](../../docs/i18n/ko/src/styles/README.md) · [中文](../../docs/i18n/zh/src/styles/README.md) · [Español](../../docs/i18n/es/src/styles/README.md) · [Français](../../docs/i18n/fr/src/styles/README.md) · [हिन्दी](../../docs/i18n/hi/src/styles/README.md)

Global CSS is split by responsibility.

- `tokens.css`: Shared sizing and spacing values.
- `layout.css`: Width and structure for Starlight layout areas.
- `markdown.css`: Body markdown elements.
- `header-controls.css`: Header language and theme controls.
- `page-navigation.css`: Previous and next page links.
- `interaction.css`: Text-selection behavior for interactive UI such as logos,
  sidebars, buttons, and select boxes.
- `accessibility.css`: Accessibility improvements for focus, high contrast,
  reduced motion, and direction isolation.

The load order is defined in `../config/styles.mjs`.

Browser behavior that is not CSS, such as keyboard navigation, is managed in
`../../public/keyboard-navigation.js` and `../config/head.mjs`.

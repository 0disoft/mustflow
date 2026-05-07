# docs-site configuration

Languages: [English](README.md) · [한국어](../../docs/i18n/ko/src/config/README.md) · [中文](../../docs/i18n/zh/src/config/README.md) · [Español](../../docs/i18n/es/src/config/README.md) · [Français](../../docs/i18n/fr/src/config/README.md) · [हिन्दी](../../docs/i18n/hi/src/config/README.md)

This directory splits Starlight configuration into focused source files.

- `site.mjs`: Site name and deployment URL.
- `head.mjs`: Tags added to every documentation page `<head>`.
- `locales.mjs`: Documentation language list.
- `machine-readable.mjs`: Public metadata for `ai.txt`, `llms.txt`, `llms-full.txt`, and `robots.txt`.
- `navigation.mjs`: Documentation links and groups shown in the sidebar.
- `sidebar.mjs`: Sidebar entry point passed to Starlight.
- `styles.mjs`: Global CSS load order.
- `starlight.mjs`: Starlight options composed from the files above.

When a new document should appear in the sidebar, add its link to
`navigation.mjs`. When adding a global style file, update `styles.mjs` at the
same time. When adding a browser script, register it in `head.mjs`.

# docs-site lib

Languages: [English](README.md) · [한국어](../../docs/i18n/ko/src/lib/README.md) · [中文](../../docs/i18n/zh/src/lib/README.md) · [Español](../../docs/i18n/es/src/lib/README.md) · [Français](../../docs/i18n/fr/src/lib/README.md) · [हिन्दी](../../docs/i18n/hi/src/lib/README.md)

This directory contains small generation helpers shared by multiple docs-site
routes.

- `machine-readable.mjs`: Generates `ai.txt`, `llms.txt`, `llms-full.txt`, and
  `robots.txt` responses.

Keep route files thin. Manage the source values for public metadata text in
`../config/machine-readable.mjs`.

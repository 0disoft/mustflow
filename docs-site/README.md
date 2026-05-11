# mustflow docs site

Languages: [English](README.md) · [한국어](docs/i18n/ko/README.md) · [中文](docs/i18n/zh/README.md) · [Español](docs/i18n/es/README.md) · [Français](docs/i18n/fr/README.md) · [हिन्दी](docs/i18n/hi/README.md)

This is the documentation site deployed to `0disoft.github.io/mustflow`.

The documentation site is not installed into user repositories via `mf init`.
It provides detailed guidance on the files and configurations created by mustflow.

Site content is localized within `src/content/docs/<locale>/`.

## Commands

```sh
bun run dev
bun run check
bun run build
bun run preview
```

From the repository root, use these wrapper commands:

```sh
bun run docs:dev
bun run docs:check
bun run docs:build
bun run docs:preview
```

For agent verification from the repository root, prefer the configured mustflow
documentation intent:

```sh
mf run docs_validate
```

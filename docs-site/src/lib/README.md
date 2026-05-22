# docs-site lib

Languages: [English](README.md) · [한국어](../../docs/i18n/ko/src/lib/README.md) · [中文](../../docs/i18n/zh/src/lib/README.md) · [Español](../../docs/i18n/es/src/lib/README.md) · [Français](../../docs/i18n/fr/src/lib/README.md) · [हिन्दी](../../docs/i18n/hi/src/lib/README.md)

This directory acts as the shared utility layer for the documentation site. It contains pure, reusable code generation helpers that are shared across multiple Astro routes, pages, or endpoints.

---

## Architectural Principles: Thin Controllers

To ensure the documentation site remains performant and easy to test, the project follows the **Thin Controller / Thin Route** architecture:
* **No Inline Complex Logic**: Route templates and Astro pages should focus purely on resolving requests and layout assembly.
* **Functional Decoupling**: Complex metadata formatting, manifest processing, and string sanitization must reside in pure helper functions within this directory.
* **Testability**: Keeping helpers pure and isolated allows them to be unit-tested without launching the entire Astro rendering harness.

---

## File Registry

* **`machine-readable.mjs`**: Contains the core rendering engine that aggregates structured settings from `../config/machine-readable.mjs` and translates them into plain text formats for `ai.txt`, `llms.txt`, `llms-full.txt`, and `robots.txt` endpoints.

---

## Guidelines for Introducing New Helpers

When adding a new helper or utility:
1. Ensure the function is **pure** (produces identical outputs for identical inputs, with no side effects).
2. Decouple it from Astro-specific contexts (e.g., avoid referencing Astro globals or browser APIs directly unless strictly required).
3. Update this registry with the helper's purpose and reference files.

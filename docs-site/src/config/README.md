# docs-site configuration

Languages: [English](README.md) · [한국어](../../docs/i18n/ko/src/config/README.md) · [中文](../../docs/i18n/zh/src/config/README.md) · [Español](../../docs/i18n/es/src/config/README.md) · [Français](../../docs/i18n/fr/src/config/README.md) · [हिन्दी](../../docs/i18n/hi/src/config/README.md)

This directory hosts the configuration components for Starlight. Instead of relying on a single, monolithic configuration file, `docs-site` adopts a modularized design approach where options are split into focused, domain-specific files.

---

## Design Rationale

Maintaining a global documentation site requires scaling localization, styling, metadata, and navigation concurrently. By decoupling the configurations into individual `.mjs` modules, we ensure:
* **Isolation of Concerns**: Changes to the navigation sidebar do not impact SEO metadata or locale routes.
* **Safer Merges**: Multiple contributors can update translations and navigation links simultaneously with minimal git conflict risks.

---

## Configuration Files Map

* **`site.mjs`**: Contains core site metadata, such as the production URL, title, and default settings.
* **`head.mjs`**: Regulates custom tags injected into the HTML `<head>` of every documentation page. Register analytics, external CDN links, or site-wide scripts here.
* **`locales.mjs`**: Defines the supported translation locales and mapping priorities.
* **`machine-readable.mjs`**: Declares public metadata parameters used to generate `ai.txt`, `llms.txt`, `llms-full.txt`, and `robots.txt`.
* **`navigation.mjs`**: The authoritative registry for the documentation sidebar structure, nesting groups, and links.
* **`sidebar.mjs`**: Orchestrates and passes the structured navigation config directly into Starlight.
* **`styles.mjs`**: Regulates the strict loading and inheritance order of global style files.
* **`starlight.mjs`**: The central composer that dynamically aggregates all the modules above into the final Starlight settings.

---

## The Role of `machine-readable.mjs` (AI & LLM Alignment)

With the rise of agentic AI coding assistants and LLM web crawlers, modern documentation must be easily indexable by machines.
* **`llms.txt` & `llms-full.txt`**: Standardized endpoints presenting condensed raw markdown layouts optimized for LLMs.
* **`ai.txt`**: Provides hints and strict context boundaries specifically tailored for developer tools and coding agents reading this site.
* Configured properties in `machine-readable.mjs` directly govern how these files are rendered.

---

## Step-by-step Maintenance Guides

### Adding a New Document to the Sidebar
1. Write or place your new markdown file in `src/content/docs/<locale>/path/to/file.md`.
2. Open `src/config/navigation.mjs`.
3. Locate the target section array. Add your entry object:
   ```javascript
   { label: 'My New Page', slug: 'path/to/file' }
   ```
4. Verify navigation builds successfully using `bun run docs:check`.

### Registering a Global Style File
1. Create your CSS file under `src/styles/`.
2. Open `src/config/styles.mjs`.
3. Add the relative path of your stylesheet to the exported array, ensuring correct cascade order.

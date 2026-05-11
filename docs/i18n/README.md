# README Translations

The root [`README.md`](../../README.md) serves as the source of truth for the repository and the npm package. Ensure translations in this directory stay aligned with the root README whenever public behavior, commands, installation steps, or release checks change.

## Language Files

| Language | Path | Status |
| --- | --- | --- |
| English | [../../README.md](../../README.md) | Source |
| Korean | [ko/README.md](ko/README.md) | Translated |
| Chinese | [zh/README.md](zh/README.md) | Translated |
| Spanish | [es/README.md](es/README.md) | Translated |
| French | [fr/README.md](fr/README.md) | Translated |
| Hindi | [hi/README.md](hi/README.md) | Translated |

## Maintenance Notes

- Keep the language switcher line synchronized across the root README and every locale README.
- Locale README files may initially be seeded from English if the locale is already supported by the CLI, templates, and documentation site. Mark these seeded files until they are fully translated.
- Keep command examples and file paths identical to the root README unless a locale-specific note is necessary.
- Always update the root README first, then propagate the changes to each translation.

---
title: i18n.toml
description: Metadatos de plantilla para seguir documentos canónicos y traducciones.
---

`i18n.toml` sigue el idioma canónico y el estado de traducción de los documentos de plantilla de mustflow.

`mf init` no copia este archivo en los repositorios de usuario. Es metadato del paquete para seguir revisiones de documentos de plantilla y estado de traducción.

## Por qué existe

Cuando los documentos cambian a menudo mediante incidencias y solicitudes de cambio, la hora de modificación del archivo no basta para saber qué idioma está actualizado.

mustflow compara la `revision` del documento canónico con el `source_revision` de cada traducción.

## Forma

```toml
version = 1
source_locale = "en"

[documents."agents.root"]
source = "locales/en/AGENTS.md"
source_locale = "en"
revision = 1
translations.ko = { path = "locales/ko/AGENTS.md", source_revision = 1, status = "current" }

[documents."docs.agent-workflow"]
source = "locales/en/.mustflow/docs/agent-workflow.md"
source_locale = "en"
revision = 1
translations.ko = { path = "locales/ko/.mustflow/docs/agent-workflow.md", source_revision = 1, status = "current" }

[documents."skill.code-review"]
source = "locales/en/.mustflow/skills/code-review/SKILL.md"
source_locale = "en"
revision = 1
translations.ko = { path = "locales/ko/.mustflow/skills/code-review/SKILL.md", source_revision = 1, status = "current" }
```

## Campos

- `version`: versión de este formato de metadatos.
- `source_locale`: idioma canónico de los documentos actuales de la plantilla.
- `status_values`: valores de estado de traducción permitidos.
- `documents.<id>`: identificador estable de un documento seguido.
- `source`: ruta interna de la plantilla al documento canónico.
- `source_locale`: idioma canónico de ese documento.
- `revision`: revisión canónica del documento.
- `translations`: lugar para relacionar documentos traducidos con revisiones fuente y estado.

## Valores de estado

- `current`: la traducción coincide con la revisión canónica actual.
- `stale`: el documento canónico cambió y la traducción no se actualizó.
- `needs_review`: la traducción existe, pero necesita revisión.
- `missing`: la traducción no existe.

La vigencia se determina comparando `revision` con el `source_revision` de cada traducción, no por la hora de modificación del archivo.

## Validación

El conjunto de pruebas del paquete valida estos metadatos antes de publicar:

- `source_locale` debe coincidir con `manifest.toml`.
- Las rutas de fuente y traducción deben apuntar a archivos reales de la plantilla.
- Las traducciones `current` deben usar el mismo `source_revision` que la `revision` del documento fuente.
- El frontmatter de Markdown debe coincidir con el identificador del documento seguido y con su configuración regional.
- Los archivos Markdown canónicos deben usar `canonical: true`; los archivos Markdown traducidos deben usar `canonical: false`.

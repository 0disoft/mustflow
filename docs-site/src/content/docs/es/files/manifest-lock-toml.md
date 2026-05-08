---
title: .mustflow/config/manifest.lock.toml
description: Archivo generado de estado de instalación escrito por mf init.
---

`.mustflow/config/manifest.lock.toml` se genera o actualiza después de un `mf init` correcto.

No se copia desde la plantilla. Registra qué archivos fueron creados, fusionados, dejados sin cambios o sobrescritos en el repositorio de destino.

## Cuándo se escribe

- Se escribe después de un `mf init` correcto.
- Se escribe cuando `--merge` inserta un bloque gestionado en un `AGENTS.md` existente.
- Se escribe cuando `--force` crea copias de seguridad de archivos en conflicto y los sobrescribe.
- No se escribe cuando la instalación se aborta por conflictos.
- No se escribe cuando `--dry-run` solo imprime el plan de instalación.

## Función

- Registra el identificador y la versión de plantilla usados para la instalación.
- Registra el hash de línea base de cada archivo instalado.
- Registra la acción realizada para cada archivo.
- Da a comandos como `mf check`, `mf status` y `mf update --dry-run` una línea base estable del estado de instalación.

## Forma

```toml
schema_version = "1"
generated_by = "mustflow"

[template]
id = "default"
version = "1.0.1"
profile = "minimal"
locale = "ko"

[files."AGENTS.md"]
source = "template_locale"
last_action = "created"
content_hash = "sha256:..."
```

## Campos

- `schema_version`: versión del esquema del archivo de bloqueo.
- `generated_by`: herramienta que generó el archivo.
- `template.id`: identificador de plantilla usado durante la instalación.
- `template.version`: versión de plantilla usada durante la instalación.
- `template.profile`: perfil de proyecto seleccionado durante la instalación.
- `template.locale`: configuración regional de los documentos mustflow seleccionada durante la instalación.
- `template.agent_lang`: idioma de informes del agente, cuando se selecciona.
- `product_i18n`: sección opcional escrita cuando se seleccionan idiomas de texto de producto.
- `files."<path>"`: registro de instalación por archivo.
- `source`: origen del contenido del archivo. Usa `template_locale`, `template_common` o `managed_block`.
- `last_action`: acción aplicada durante la última instalación. Una de `created`, `unchanged`, `merged`, `overwritten` o `customized`.
- `content_hash`: hash SHA-256 de línea base del contenido que mustflow registró como instalado o actualizado de forma segura.

`last_action = "customized"` significa que el hash registrado es una línea base específica del repositorio. `mf update` conserva ese archivo mientras su hash actual siga coincidiendo con `content_hash`.

Cuando `mf dashboard` guarda `.mustflow/config/preferences.toml`, actualiza ese archivo rastreado como `last_action = "customized"` si `manifest.lock.toml` existe. Esto registra la edición local de preferencias aceptada sin tratar todo el archivo de bloqueo como una instantánea activa del estado actual.

## Línea base de hash

Actualmente, `content_hash` es la línea base del momento de instalación.
No es un hash vivo del archivo actual.

`mf check`, `mf status` y `mf update --dry-run` calculan el hash actual del archivo en tiempo de ejecución y lo comparan con esta línea base. Los hashes de plantilla tampoco se almacenan en el archivo de bloqueo; se calculan desde la plantilla incluida en el paquete mustflow instalado.

Esto mantiene el archivo de bloqueo como línea base de instalación, no como instantánea activa del estado actual.

Si mustflow más adelante actualiza solo un bloque administrado dentro de un archivo, el esquema del lock debe agregar primero una línea base a nivel de bloque. El `content_hash` de archivo completo de v1 no basta para demostrar que el bloque administrado no cambió.

## Reglas de edición

Este archivo no es un documento fuente escrito a mano.

Regénéralo con `mf init` o con un futuro comando dedicado de actualización cuando se deba refrescar el estado de instalación. Las ediciones manuales pueden hacer que los hashes registrados no coincidan con el contenido real de los archivos.

`mf update --dry-run` usa `content_hash` como línea base del momento de instalación. Si el hash actual del archivo difiere de esa línea base, el archivo se trata como cambio local y la actualización automática se bloquea.

Para la justificación, consulta [Decisión sobre la estructura de manifest.lock.toml](../../design/manifest-lock-decision/).

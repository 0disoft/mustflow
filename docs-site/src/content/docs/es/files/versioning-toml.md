---
title: versioning.toml
description: Archivo opcional para declarar fuentes de versionado específicas del repositorio.
---

`.mustflow/config/versioning.toml` es opcional. Úsalo solo cuando la detección automática no pueda identificar con claridad la fuente real de versión del repositorio.

`mf init` no instala este archivo por defecto.

## Forma básica

```toml
schema_version = "1"

[[sources]]
path = "package.json"
kind = "package_manifest"
authority = "source"
description = "Versión del paquete publicado."
```

## Campos

- `schema_version`: Versión del formato. Usa `"1"`.
- `sources`: Una o más entradas de fuente de versión declaradas.
- `sources.path`: Ruta relativa al archivo de versión dentro de la raíz mustflow.
- `sources.kind`: `package_manifest`, `template_manifest` o `template_lock`.
- `sources.authority`: `source` si este archivo controla la versión, o `derived` si sigue otra fuente.
- `sources.description`: Nota breve opcional para humanos.

## Comportamiento

`mf version-sources` incluye las entradas declaradas y las marca con `declared = true` en la salida JSON.

`mf check` valida la forma del archivo cuando existe. `mf check --strict` también informa rutas declaradas que no existen.

Este archivo no concede autoridad para publicar, confirmar cambios, crear etiquetas, enviar cambios ni subir versiones. Esas acciones siguen dependiendo de instrucciones directas del usuario, reglas del host y el contrato de comandos configurado.

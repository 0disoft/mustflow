---
title: mf version-sources
description: Comando de solo lectura para inspeccionar fuentes de versión de paquetes y plantillas.
---

`mf version-sources` informa qué archivos del root mustflow actual parecen fuentes de versión de paquete o plantilla. También lee declaraciones opcionales desde `.mustflow/config/versioning.toml`.

El comando no edita versiones, crea tags, confirma cambios ni hace push. Permite que agentes y futuros paneles del dashboard vean el mismo descubrimiento de fuentes de versión usado por `mf check --strict`.

## Salida

- `mustflow root`: Root mustflow actual.
- `Versioning preferences`: Si las preferencias `[release.versioning]` están activadas.
- `Sources`: Archivos detectados o declarados y su tipo de fuente.

## Ejemplo

```sh
npx mf version-sources
```

## Campos JSON

```sh
npx mf version-sources --json
```

- `schema_version` (`string`): Versión del formato de salida.
- `command` (`string`): Siempre `version-sources`.
- `mustflow_root` (`string`): Root mustflow actual.
- `versioning_enabled` (`boolean`): Si las preferencias de impacto de versión están activadas.
- `sources` (`object[]`): Fuentes de versión con `path`, `kind` y los campos opcionales `declared` y `authority`.

## Ayuda y códigos de salida

```sh
npx mf version-sources --help
```

- Código `0`: Las fuentes de versión se inspeccionaron e imprimieron.
- Código `1`: El comando recibió una opción desconocida.

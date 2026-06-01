---
title: mf workspace
description: Inspección de solo lectura para raíces workspace configuradas y contratos de repositorios anidados.
---

`mf workspace status` inspecciona las raíces workspace configuradas y los repositorios anidados descubiertos.
`mf workspace command-catalog` agrega la disponibilidad de intents de comando de cada repositorio descubierto.
`mf workspace verify --changed --plan-only` agrega el plan de verificación de cambios de cada repositorio descubierto.

No ejecuta comandos, no modifica archivos, no expone cadenas de comando sin procesar y no permite que un repositorio padre conceda autoridad de comandos a un repositorio hijo. Cada repositorio descubierto mantiene su propio `.mustflow/config/commands.toml` como única fuente de autoridad de comandos.

## Ejemplo

```sh
npx mf workspace status
npx mf workspace status --json
npx mf workspace command-catalog --json
npx mf workspace verify --changed --plan-only --json
```

## Campos JSON

```sh
npx mf workspace status --json
```

- `schema_version` (`string`): versión del formato de salida.
- `command` (`string`): siempre `workspace status`.
- `workspace` (`object`): configuración de escaneo workspace desde `.mustflow/config/mustflow.toml`.
- `policy` (`object`): indica que el informe es de solo lectura y no concede autoridad de comandos.
- `repositories` (`object[]`): repositorios git anidados descubiertos y su estado de contrato mustflow local.
- `issues` (`string[]`): problemas de descubrimiento o análisis de solo lectura.

Para `mf workspace command-catalog --json`, `command` siempre es `workspace command-catalog`, y cada repositorio incluye disponibilidad de intents, entradas `mf run <intent>` y la ruta del repositorio donde debe ejecutarse ese comando.

Para `mf workspace verify --changed --plan-only --json`, `command` siempre es `workspace verify`, y cada repositorio incluye archivos cambiados, intents seleccionados, brechas y la ruta del repositorio donde deben ejecutarse los `mf run <intent>` seleccionados.

## Ayuda y códigos de salida

```sh
npx mf workspace --help
```

- Código de salida `0`: se inspeccionó el estado del workspace.
- Código de salida `1`: el comando recibió una entrada no válida.

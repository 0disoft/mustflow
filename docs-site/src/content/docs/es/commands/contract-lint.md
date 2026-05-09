---
title: mf contract-lint
description: Revisión de solo lectura del contrato de comandos en commands.toml.
---

`mf contract-lint` inspecciona `.mustflow/config/commands.toml` sin ejecutar ningún comando configurado.

Úsalo cuando necesites una vista enfocada de errores y advertencias del contrato de comandos. Es más estrecho que `mf check`: los intents `configured` mal formados son errores, mientras que los intents `unknown` y `manual_only` se muestran como advertencias.

## Ejemplo

```sh
npx mf contract-lint
npx mf contract-lint --json
```

## Campos JSON

```sh
npx mf contract-lint --json
```

- `schema_version` (`string`): versión del formato de salida.
- `command` (`string`): siempre `contract-lint`.
- `mustflow_root` (`string`): raíz mustflow actual.
- `report.status` (`string`): `passed`, `warning` o `failed`.
- `report.summary` (`object`): conteos de intents, ejecutables, errores y advertencias.
- `report.issues` (`object[]`): problemas con `severity`, `code`, `intent` y `message`.
- `report.sourceFiles` (`string[]`): archivos que definen las reglas del contrato.

## Ayuda y códigos de salida

```sh
npx mf contract-lint --help
```

- Código `0`: no se encontraron errores bloqueantes del contrato de comandos.
- Código `1`: se encontraron errores o la entrada no es válida.

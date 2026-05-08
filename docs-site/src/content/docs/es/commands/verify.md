---
title: mf verify
description: Ejecuta intenciones de verificación configuradas seleccionadas por metadatos required_after.
---

`mf verify --reason <event>` lee `.mustflow/config/commands.toml`, encuentra intenciones cuyo `required_after` contiene la razón indicada y ejecuta solo las que están configuradas, son de una sola ejecución, permiten ejecución por agente y tienen stdin cerrado.

## Reglas de selección

- La razón debe coincidir exactamente con el texto de `required_after`.
- Las intenciones ejecutables usan la misma ruta segura que `mf run <intent>`.
- Las intenciones desconocidas, manuales, de larga duración, bloqueadas o incompletas no se adivinan; se informan como omitidas.
- Si ninguna intención coincide con la razón, el resultado es `blocked`.

## Ejemplos

```sh
npx mf verify --reason code_change
npx mf verify --reason docs_change --json
```

## Campos JSON

```sh
npx mf verify --reason code_change --json
```

La salida legible por máquinas usa estos campos:

- `schema_version` (`string`): versión del formato del informe.
- `command` (`string`): siempre `verify`.
- `mustflow_root` (`string`): raíz mustflow resuelta.
- `reason` (`string`): razón `required_after` solicitada.
- `status` (`string`): `passed`, `partial`, `failed` o `blocked`.
- `summary` (`object`): conteos de intenciones encontradas, ejecutadas, aprobadas, fallidas y omitidas.
- `results` (`object[]`): resultado de ejecución u omisión por intención.

## Códigos de salida

- `0`: todas las intenciones ejecutables seleccionadas pasaron y ninguna se omitió.
- `1`: la verificación falló, fue parcial, quedó bloqueada o la entrada no fue válida.

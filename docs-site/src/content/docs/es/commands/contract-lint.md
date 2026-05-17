---
title: mf contract-lint
description: Revisión de solo lectura del contrato de comandos en commands.toml.
---

`mf contract-lint` inspecciona `.mustflow/config/commands.toml` sin ejecutar ningún comando configurado.

Úsalo cuando necesites una vista enfocada de errores y advertencias del contrato de comandos. Es más estrecho que `mf check`: los intents `configured` mal formados son errores, mientras que los intents `unknown` y `manual_only` se muestran como advertencias.

Agrega `--coverage` cuando también quieras ver si las razones de validación de la clasificación de cambios están conectadas con metadatos `required_after`. Los hallazgos de cobertura son advertencias y no cambian qué comandos son ejecutables.

Cuando un intent usa un script de paquete como `bun run <script>`, `mf contract-lint` también revisa el `package.json` en el `cwd` de ese intent si existe. Los scripts referenciados pero ausentes son advertencias; no otorgan autoridad de ejecución ni aplican correcciones automáticas.

Agrega `--suggest` para leer entradas del `package.json` raíz, Makefile o justfile e imprimir fragmentos de intent solo para revisión. Los fragmentos sugeridos usan `status = "unknown"` y omiten campos ejecutables como `argv`, `lifecycle` y `run_policy`, así que no autorizan ejecución hasta que una persona los edite en `.mustflow/config/commands.toml`.

## Ejemplo

```sh
npx mf contract-lint
npx mf contract-lint --coverage
npx mf contract-lint --suggest
npx mf contract-lint --json
npx mf contract-lint --coverage --json
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
- `report.suggestions` (`object[]`, opcional): aparece solo con `--suggest`. Incluye archivo fuente, entrada fuente, sugerencia de comando, nombre de intent sugerido, `status = "unknown"`, razón y un fragmento TOML solo para revisión.
- `report.coverage` (`object`, opcional): aparece solo con `--coverage`. Incluye razones de clasificación conocidas, razones de verificación documentadas, razones `required_after`, razones ejecutables y hallazgos de cobertura.
- `report.coverage.findings` (`object[]`): hallazgos de cobertura con `code`, `reason`, `intent`, `intents` y `message` estables.

## Ayuda y códigos de salida

```sh
npx mf contract-lint --help
```

- Código `0`: no se encontraron errores bloqueantes del contrato de comandos.
- Código `1`: se encontraron errores o la entrada no es válida.

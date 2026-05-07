---
title: mf doctor
description: Comando de diagnóstico de solo lectura para la raíz mustflow actual.
---

`mf doctor` proporciona un resumen de estado breve para la raíz mustflow actual.
Agrupa los aspectos más críticos de `mf check` y `mf context`, y luego sugiere los siguientes pasos que puede seguir un agente.

Este comando nunca escribe archivos. Úsalo cuando un agente o una persona necesite una primera orientación antes de modificar el repositorio.

## Qué inspecciona

- Raíz mustflow actual.
- Si `AGENTS.md` y `.mustflow/` están presentes.
- Resultado de `mf check`.
- Estado de `manifest.lock.toml`.
- Identificador y versión de plantilla del archivo de bloqueo, cuando existan.
- Si `.mustflow/config/commands.toml` existe y expone intenciones `oneshot` ejecutables.
- Rutas obligatorias y opcionales del orden de lectura de `mustflow.toml` que faltan.
- Si se generó `REPO_MAP.md`.
- Si existe el índice local `.mustflow/cache/mustflow.sqlite`.
- Si existe el último recibo de `mf run`.
- Elementos de la lista de diagnóstico y siguientes comandos sugeridos.

## Ejemplo

```sh
npx mf doctor
```

Salida de ejemplo:

```text
mustflow doctor
mustflow root: /path/to/project
Installed: yes
Strict: no
Check: passed
Issues: 0
Command contract: present
Runnable intents: 3

Health:
- [ok] Install: installed
- [ok] Validation: 0 issues
- [ok] Command contract: present, 3 runnable intents
- [ok] Read order: all required files present
- [info] REPO_MAP.md: not generated (run: mf map --write)
- [info] Local index: not generated (run: mf index)
- [info] Latest run: no run receipt yet (run: mf run <intent>)

Suggested commands:
- mf help workflow
- mf help commands
- mf context --json
- mf check --strict
- mf map --write
- mf index
- mf run <intent>

No files were written.
```

## Campos JSON

```sh
npx mf doctor --json
```

La salida legible por máquinas usa estos campos:

- `schema_version` (`number`): versión del formato de salida.
- `command` (`string`): siempre `doctor`.
- `mustflow_root` (`string`): raíz mustflow actual.
- `installed` (`boolean`): si existen `AGENTS.md` y `.mustflow/`.
- `strict` (`boolean`): si las comprobaciones `--strict` estaban habilitadas.
- `ok` (`boolean`): si la instalación existe y la validación pasó.
- `check` (`object`): resultado de validación según las reglas de `mf check`.
- `context` (`object`): estado principal que un agente necesita antes de empezar.
- `diagnostics` (`object[]`): diagnóstico por área para instalación, validación, contrato de comando, orden de lectura, mapa del repositorio, índice local y ejecución más reciente.
- `next_steps` (`string[]`): comandos que un agente puede ejecutar después sin adivinar.

Los campos anidados usan estas formas:

- `check.ok` (`boolean`): si la validación pasó.
- `check.issue_count` (`number`): número de problemas de validación.
- `check.issues` (`string[]`): mensajes de problemas de validación.
- `context.manifest_lock` (`string`): estado del archivo de bloqueo. Uno de `present`, `missing` o `invalid`.
- `context.template` (`object | null`): identificador y versión de plantilla, cuando se conozcan.
- `context.command_contract_exists` (`boolean`): si existe `commands.toml`.
- `context.runnable_intents` (`string[]`): nombres de intenciones `oneshot` configuradas que los agentes pueden ejecutar.
- `context.missing_read_order` (`string[]`): archivos requeridos del orden de lectura que faltan.
- `context.missing_optional_read_order` (`string[]`): archivos opcionales del orden de lectura que faltan.
- `context.latest_run_exists` (`boolean`): si existe el último recibo de ejecución.
- `diagnostics[].id` (`string`): nombre del área de diagnóstico.
- `diagnostics[].status` (`string`): estado del diagnóstico. Uno de `ok`, `warn`, `fail` o `info`.
- `diagnostics[].summary` (`string`): estado breve legible para personas.
- `diagnostics[].action` (`string | null`): comando que se debe ejecutar a continuación.

## Modo estricto

```sh
npx mf doctor --strict --json
```

El modo estricto usa las mismas comprobaciones adicionales que `mf check --strict`.
Úsalo después de cambiar documentos, skills, contratos de comando, ajustes de retención o el comportamiento del mapa del repositorio.

## Códigos de salida

- `0`: la raíz fue inspeccionada y no se encontraron problemas.
- `1`: la validación encontró problemas, falta la instalación o el comando recibió una opción desconocida.

Los agentes y la automatización deben leer `ok`, `check.issues`, `diagnostics` y `next_steps` de la salida `--json` en lugar de analizar el resumen para personas.

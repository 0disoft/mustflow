---
title: .mustflow/config/commands.toml
description: Contratos de intención de comando para pruebas, lint, compilación y comprobaciones de documentación.
---

`.mustflow/config/commands.toml` es el contrato de intención de comando que impide que los agentes adivinen comandos del proyecto.

## Dónde se usa

- `AGENTS.md` usa este archivo para aplicar la regla de no adivinar comandos.
- `agent-workflow.md` trata este archivo como la fuente de verdad de la política de ejecución de comandos.
- Cada `SKILL.md` referencia nombres de intención como `test`, `lint` y `build` en lugar de comandos sin procesar.
- Herramientas como `mf check` pueden leer este archivo para validar ejecutabilidad y campos faltantes.

## Forma

```toml
schema_version = "1"

[defaults]
missing_behavior = "do_not_guess"
allow_inferred_commands = false
default_cwd = "."
default_timeout_seconds = 600
stdin = "closed"
require_lifecycle = true
require_timeout_for_oneshot = true
deny_unmanaged_long_running = true
max_output_bytes = 1048576
on_timeout = "terminate_process_tree"
kill_after_seconds = 5

[intents.test]
status = "unknown"
description = "Ejecutar pruebas."
reason = "No se declaró ningún comando de prueba para este repositorio."
agent_action = "do_not_guess_report_missing"
required_after = ["code_change", "behavior_change"]
```

## Campos predeterminados

- `schema_version`: versión de este formato de archivo.
- `defaults.missing_behavior`: qué hacen los agentes cuando falta una intención.
- `defaults.allow_inferred_commands`: indica si los agentes pueden inferir comandos. El valor predeterminado debe ser `false`.
- `defaults.default_cwd`: directorio de trabajo predeterminado cuando una intención no especifica uno.
- `defaults.default_timeout_seconds`: tiempo de espera predeterminado cuando una intención no especifica uno.
- `defaults.stdin`: comportamiento predeterminado de entrada estándar. Los comandos ejecutados por agentes deben usar `closed`.
- `defaults.require_lifecycle`: indica si las intenciones ejecutables deben declarar un ciclo de vida de comando.
- `defaults.require_timeout_for_oneshot`: indica si los comandos finitos deben declarar un tiempo de espera.
- `defaults.deny_unmanaged_long_running`: indica si se bloquean comandos largos no gestionados.
- `defaults.max_output_bytes`: límite de salida predeterminado aceptado por el ejecutor.
- `defaults.on_timeout`: política de manejo de tiempo agotado.
- `defaults.kill_after_seconds`: espera adicional disponible para limpiar procesos.

## Estado de intención

- `configured`: hay un comando ejecutable declarado.
- `unknown`: todavía no existe contrato de comando.
- `not_applicable`: este repositorio no necesita esta validación.
- `manual_only`: una persona debe decidir si se ejecuta y cómo.
- `disabled`: el comando es conocido, pero no debe ejecutarse ahora.

Los agentes solo pueden ejecutar intenciones con `status = "configured"`.

## Campos de intención

- `description`: propósito de la intención de comando.
- `reason`: por qué la intención no es ejecutable o aún no está declarada.
- `agent_action`: qué debe hacer el agente cuando no puede ejecutar la intención.
- `required_after`: tipos de cambio tras los cuales se debe considerar esta intención.
- `kind`: clasificación, como comando integrado de mustflow o comando del repositorio.
- `lifecycle`: indica si el comando es finito o de larga duración.
- `run_policy`: indica si los agentes pueden ejecutar la intención o si se requiere aprobación explícita.
- `argv`: comando y argumentos ejecutados sin interpretación de shell.
- `mode`: establecer en `shell` solo cuando se requiere sintaxis de shell.
- `cmd`: cadena de comando de shell usada cuando `mode = "shell"`.
- `cwd`: directorio de trabajo del comando.
- `timeout_seconds`: tiempo de espera del comando.
- `stdin`: comportamiento de entrada estándar. Las intenciones ejecutables por agentes deben usar `closed`.
- `success_exit_codes`: códigos de salida considerados correctos.
- `writes`: rutas que el comando puede modificar.
- `network`: indica si el comando usa la red.
- `destructive`: indica si el comando puede ser destructivo.

## Intenciones ejecutables

Las intenciones configuradas deben usar un arreglo `argv` siempre que sea posible.

```toml
[intents.test]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Ejecutar pruebas."
argv = ["pnpm", "test"]
cwd = "."
timeout_seconds = 900
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
```

Si se requiere una shell, establece `mode = "shell"` y `cmd`, y luego declara el impacto del comando y las rutas de escritura.

Para `unknown`, `not_applicable`, `manual_only` y `disabled`, los agentes no deben inferir un comando de reemplazo.

## Intenciones relacionadas con pruebas

La plantilla predeterminada separa pruebas completas, pruebas relacionadas, comprobaciones de auditoría, cobertura y actualizaciones de instantáneas.

```toml
[intents.test_related]
status = "unknown"
reason = "No se declaró ningún comando de pruebas relacionadas para este repositorio."
agent_action = "do_not_guess_report_missing"

[intents.test_audit]
status = "unknown"
reason = "No se declaró ningún comando de auditoría de pruebas obsoletas."
agent_action = "do_not_guess_report_missing"

[intents.snapshot_update]
status = "manual_only"
reason = "Las actualizaciones de instantáneas pueden ocultar cambios de salida no intencionados."
agent_action = "do_not_update_snapshots_without_approval"
```

Los agentes deben usar estos nombres de intención al mantener pruebas, pero aun así deben resolver cada una mediante `commands.toml`. Si falta un comando de pruebas relacionadas o de auditoría, se informa; no se adivina.

## Ciclo de vida del comando

- `oneshot`: comando finito que debe terminar.
- `server`: servidor local de larga duración.
- `watch`: comando que observa archivos y no termina por sí solo.
- `interactive`: comando que espera entrada del usuario.
- `browser`: navegador o proceso de interfaz.
- `background`: proceso destinado a permanecer en segundo plano.

De forma predeterminada, los agentes solo pueden ejecutar intenciones `oneshot`. `server`, `watch`, `interactive`, `browser` y `background` no deben usar `run_policy = "agent_allowed"`.

`mf run <intent>` ejecuta solo intenciones con `status = "configured"`, `lifecycle = "oneshot"`, `run_policy = "agent_allowed"` y `stdin = "closed"`.
Después de la ejecución, escribe el último recibo de ejecución en `.mustflow/state/runs/latest.json`; con `--json`, también imprime el mismo recibo en la salida estándar.

## Intenciones integradas

`mustflow_doctor` inspecciona el estado de instalación de la raíz mustflow actual, el resultado de comprobación, las intenciones ejecutables y los siguientes pasos sin escribir archivos.

```toml
[intents.mustflow_doctor]
status = "configured"
kind = "mustflow_builtin"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = ["mf", "doctor", "--json"]
stdin = "closed"
writes = []
```

`repo_map` genera o actualiza `REPO_MAP.md`.

```toml
[intents.repo_map]
status = "configured"
kind = "mustflow_builtin"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = ["mf", "map", "--write"]
stdin = "closed"
writes = ["REPO_MAP.md"]
```

El directorio raíz `config/` puede pertenecer al proyecto del usuario, por lo que mustflow no lo usa.

## Intenciones relacionadas con Git

La plantilla predeterminada incluye intenciones Git de solo lectura usadas para informes finales y sugerencias de mensajes de commit.

```toml
[intents.changes_status]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = ["git", "status", "--short"]
stdin = "closed"
writes = []
network = false
destructive = false

[intents.changes_diff_summary]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = ["git", "diff", "--stat"]
stdin = "closed"
writes = []
network = false
destructive = false
```

Estas intenciones inspeccionan archivos modificados y un resumen de cambios sin modificar el estado de Git.

Los commits reales son solo manuales de forma predeterminada.

```toml
[intents.git_commit]
status = "manual_only"
reason = "Los commits requieren aprobación explícita del usuario."
agent_action = "do_not_commit_report_suggestion_only"
```

Los agentes pueden sugerir mensajes de commit, pero no deben preparar cambios, crear commits ni hacer push sin una solicitud explícita del usuario.

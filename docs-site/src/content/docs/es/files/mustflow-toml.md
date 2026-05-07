---
title: .mustflow/config/mustflow.toml
description: Declara el orden de lectura de los agentes y las rutas protegidas.
---

`.mustflow/config/mustflow.toml` declara qué archivos deben leer primero los agentes y qué rutas requieren cuidado adicional.

`mf check` hace más que analizar este archivo. También verifica que los valores de `[map]` y `[workspace]` puedan interpretarse de forma segura.

## Dónde se usa

- Convierte el orden de lectura de `AGENTS.md` en configuración verificable por máquina.
- Ayuda a los agentes a distinguir documentos propiedad de mustflow de documentos del proyecto del usuario.
- Declara rutas protegidas y de especial cuidado para reducir ediciones accidentales.
- Define qué elementos deben aparecer en el informe final de trabajo.

## Secciones

- `authority`: documentos mustflow autoritativos.
- `read_order`: orden de lectura inicial para agentes.
- `optional_read_order`: archivos que se leen cuando existen y se omiten cuando faltan.
- `authority.workflow_preferences`: ruta a preferencias predeterminadas de nivel de repositorio.
- `map`: cómo debe generarse `REPO_MAP.md` y qué archivos ancla pueden incluirse.
- `workspace`: límites para descubrir repositorios independientes anidados bajo raíces de espacio de trabajo.
- `context`: capa de contexto de proyecto usada solo cuando la tarea la necesita.
- `capabilities`: superficie de trabajo de agentes que proporciona este repositorio.
- `agent_loop`: bucle estándar que los agentes deben seguir en cada tarea.
- `harness`: límite de contrato local del repositorio para sistemas de ejecución de agentes.
- `refresh`: puntos de control para releer instrucciones de mustflow durante sesiones largas.
- `compaction`: política para separar contexto reciente sin procesar, resúmenes intermedios, resúmenes largos y retención sin procesar.
- `verification`: de dónde vienen los comandos de validación y qué inferencia está prohibida.
- `testing`: política para mantener las pruebas alineadas con el contrato de comportamiento actual.
- `handoff`: cómo traspasar de forma segura trabajo inacabado.
- `budget`: límites para actividad de agentes larga o repetida.
- `approval`: acciones que requieren aprobación humana antes de continuar.
- `isolation`: límite preferido de árbol de trabajo o sandbox para tareas largas.
- `retention`: límites de tamaño que mantienen acotados recibos de ejecución, mapas de repositorio y futuros archivos de conocimiento.
- `document_roots`: rutas que pertenecen al flujo de documentos de mustflow.
- `document_roots.generated`: documentos generados y rutas de estado local.
- `edit_policy.protected`: rutas que los agentes no deben editar de forma predeterminada.
- `edit_policy.extra_care`: rutas que requieren cautela adicional antes de editar.
- `reporting`: elementos que se deben incluir en el informe final de trabajo.

## Campos de orden de lectura

```toml
read_order = [
  "AGENTS.md",
  ".mustflow/docs/agent-workflow.md",
  ".mustflow/config/mustflow.toml",
  ".mustflow/config/commands.toml",
  ".mustflow/config/preferences.toml",
  ".mustflow/skills/INDEX.md",
]
optional_read_order = [
  ".mustflow/context/INDEX.md",
  "REPO_MAP.md",
]
```

`read_order` es el flujo de documentos obligatorio. `optional_read_order` enumera documentos que se leen cuando existen y se omiten cuando faltan.

Este archivo reduce las adivinanzas del agente y ayuda a evitar ediciones accidentales de archivos generados o secretos.

`REPO_MAP.md` pertenece a `optional_read_order` y `document_roots.generated`. Los agentes deben leerlo solo cuando se necesite navegación amplia por el repositorio, tratarlo como mapa de archivos ancla en lugar de lista completa de archivos y regenerarlo cuando haga falta.

`.mustflow/context/INDEX.md` pertenece a `optional_read_order` porque los agentes deben leerlo solo cuando el contexto de proyecto, producto, dominio, interfaz, servidor, datos, seguridad u operaciones sea relevante para la tarea.

`.mustflow/cache/**` y `.mustflow/state/**` son rutas generadas. La caché contiene archivos de apoyo reconstruibles, como el índice SQLite escrito por `mf index`; el estado contiene estado local creado durante el uso, como recibos de `mf run`. Ninguna de las dos rutas forma parte del primer orden de lectura obligatorio.

## Campos de mapa

```toml
[map]
output = "REPO_MAP.md"
mode = "anchors_only"
privacy = "minimal"
include_nested = false
anchor_files = [
  "AGENTS.md",
  "REPO_MAP.md",
  ".mustflow/config/mustflow.toml",
  ".mustflow/config/commands.toml",
  ".mustflow/config/preferences.toml",
  ".mustflow/context/INDEX.md",
  ".mustflow/context/PROJECT.md",
  ".mustflow/skills/INDEX.md",
  "README.md",
  "DESIGN.md",
  "package.json",
  "pyproject.toml",
  "go.mod",
  "Cargo.toml",
  "deno.json",
  "justfile",
  "Justfile",
  "Makefile",
  "Taskfile.yml",
]
```

`map.output` es el nombre del archivo generado. El valor predeterminado es `REPO_MAP.md`.

`map.mode = "anchors_only"` significa que el mapa incluye anclas de navegación en lugar de todos los archivos fuente.

`map.privacy = "minimal"` significa que la salida generada omite de forma predeterminada URL remotas, nombres de ramas, estado de cambios recientes, listas de comandos y resúmenes automáticos.

`map.include_nested = false` significa que los repositorios independientes anidados no se indexan de forma predeterminada. La compatibilidad con espacios de trabajo debe habilitarse explícitamente con los campos de `workspace`.

`mf check` verifica que `output` y `anchor_files` sean rutas relativas dentro de la raíz actual. Actualmente solo permite `anchors_only` para `mode` y `minimal` para `privacy`.

`preferences.toml` se incluye como ancla predeterminada para que los agentes puedan encontrar rápidamente valores predeterminados de nivel de repositorio para idioma de respuesta, documentación, mensajes de commit, registros y formato.

`DESIGN.md` es un ancla externa opcional. mustflow no lo crea, pero cuando existe, `mf map` puede mostrarlo para trabajo de interfaz, diseño visual, variables de diseño, composición o accesibilidad.

## Campos de contexto

```toml
[context]
enabled = true
root = ".mustflow/context"
index = ".mustflow/context/INDEX.md"
default_files = [
  ".mustflow/context/PROJECT.md",
]
read_policy = "task_relevant_only"
authority = "contextual"
external_anchors = [
  "README.md",
  "DESIGN.md",
]
```

`context.enabled = true` significa que el proyecto puede llevar contexto orientado a agentes bajo `.mustflow/context/`.

`context.index` apunta al enrutador que indica a los agentes qué archivos de contexto leer para la tarea.
`context.default_files` enumera los archivos de contexto instalados por la plantilla predeterminada.

`read_policy = "task_relevant_only"` significa que los agentes no deben leer todos los archivos de contexto de forma predeterminada.
`authority = "contextual"` significa que los archivos de contexto guían la orientación, pero tienen menor autoridad que las instrucciones directas del usuario, el código actual, las pruebas, los contratos de comando y las políticas configuradas.

`external_anchors` enumera archivos raíz que pueden proporcionar contexto sin convertirse en archivos propiedad de mustflow.
`README.md` es una vista general orientada a personas. `DESIGN.md` es un ancla opcional de diseño visual cuando el proyecto ya tiene una.

## Campos de espacio de trabajo

```toml
[workspace]
enabled = false
roots = []
max_depth = 4
max_repositories = 50
follow_symlinks = false
stop_at_repository_root = true
```

`workspace.enabled = false` trata la raíz actual como una raíz mustflow normal.

Para una raíz de espacio de trabajo, establece rutas como `roots = ["projects", "repos"]`. mustflow no debe escanear automáticamente directorios `projects/` o `repos/` no configurados.

`max_depth` y `max_repositories` evitan escaneos grandes accidentales. `follow_symlinks = false` impide de forma predeterminada atravesar fuera del espacio de trabajo o hacia otra unidad.

`stop_at_repository_root = true` significa que, cuando se descubre un repositorio independiente anidado, el mapa padre no debe continuar de forma recursiva por sus detalles internos. El `REPO_MAP.md` padre debe mostrar solo puntos de entrada a repositorios anidados, no describir esos repositorios.

`mf check` verifica que `roots` sean rutas relativas dentro de la raíz actual, que `max_depth` y `max_repositories` sean enteros positivos y que los interruptores de espacio de trabajo sean booleanos.

## Campos de superficie de control de agentes

```toml
[capabilities]
workflow = true
command_contract = true
skills = true
repo_map = "generated_optional"
preferences = "optional"
context = "optional"
local_index = "generated_optional"
work_items = "disabled"
services = "disabled"
adapters = []

[agent_loop]
phases = [
  "orient",
  "plan",
  "act",
  "verify",
  "report",
  "handoff",
]

[verification]
command_source = ".mustflow/config/commands.toml"
require_configured_intents = true
allow_inferred_commands = false
require_command_lifecycle = true
require_timeout_for_oneshot = true

[handoff]
enabled = false
mode = "report_only"
```

`capabilities` declara qué superficies de trabajo de agentes están disponibles en este repositorio. `workflow`, `command_contract` y `skills` son funciones centrales. `repo_map`, `preferences`, `local_index`, `work_items` y `services` son puntos de extensión basados en estado. La plantilla predeterminada proporciona el índice local como datos generados opcionales, pero `mf init` no crea el archivo de índice. Los elementos de trabajo locales y la gestión de servicios aún no están instalados.

`agent_loop.phases` es el bucle estándar de trabajo de agentes: `orient`, `plan`, `act`, `verify`, `report` y `handoff`. Es un contrato verificable por máquina, no texto decorativo.

`verification` indica que los comandos de validación vienen de `.mustflow/config/commands.toml`. `allow_inferred_commands = false` significa que los agentes no deben inferir comandos de validación desde `package.json`, `Makefile` ni convenciones de nombres.

`handoff.enabled = false` significa que la plantilla predeterminada no crea archivos locales de elementos de trabajo. El trabajo que no pueda terminarse de forma segura debe traspasarse en el informe final. La compatibilidad opcional con elementos de trabajo puede habilitarse más adelante como una función separada.

`mf check` valida booleanos, estados de capacidad permitidos, el bucle estándar y la ruta de comandos de validación.

## Campos de ejecución de agentes

```toml
[harness]
mode = "single_session"
fresh_context_preferred = true

[harness.phases]
enabled = [
  "plan",
  "work",
  "verify",
  "judge",
  "handoff",
]
```

`harness` indica que mustflow proporciona contratos locales del repositorio en lugar de un entorno autónomo completo. `mode = "single_session"` es el valor predeterminado conservador. Un futuro sistema opcional de ejecución de larga duración puede leer el mismo contrato con `long_running_optional`.

`harness.phases.enabled` define las fases que un sistema de ejecución de larga duración debe separar. Son fases, no carpetas predeterminadas ni subagentes predeterminados.

## Campos de refresco

```toml
[refresh]
enabled = true
mode = "checkpoint"
required_at = [
  "session_start",
  "task_start",
  "before_first_edit",
  "before_command_run",
  "after_instruction_file_change",
  "root_change",
  "after_compaction",
  "before_final_report",
]
turn_threshold = 10
tool_call_threshold = 25
output_bytes_threshold = 200000
state_store = "cache"

[refresh.levels.light]
read = [
  "AGENTS.md",
  ".mustflow/docs/agent-workflow.md",
]

[refresh.levels.command]
read = [
  "AGENTS.md",
  ".mustflow/config/commands.toml",
]

[refresh.levels.skill]
read = [
  "AGENTS.md",
  ".mustflow/skills/INDEX.md",
]

[refresh.levels.full]
read = [
  "AGENTS.md",
  ".mustflow/docs/agent-workflow.md",
  ".mustflow/config/mustflow.toml",
  ".mustflow/config/commands.toml",
  ".mustflow/config/preferences.toml",
  ".mustflow/skills/INDEX.md",
]
```

`refresh` declara cuándo un agente debe releer las instrucciones de mustflow porque la sesión se volvió larga, cambió la raíz, está por ejecutarse un comando o cambiaron archivos de instrucciones.

`state_store = "cache"` significa que los recuentos de turnos y la actividad de sesión no pertenecen a los archivos del proyecto. Una aplicación anfitriona puede seguirlos en caché local, pero los documentos mustflow deben permanecer estables y seguros para commits.

`refresh.levels` relaciona cada nivel de refresco con los archivos que se deben releer. Los niveles predeterminados son `light`, `command`, `skill` y `full`.

`mf check` valida el modo de refresco, nombres de puntos de control, umbrales, almacén de estado y rutas de archivos de refresco.

## Campos de compactación de contexto

```toml
[compaction]
enabled = false
strategy = "tiered"
state_store = "cache"

[compaction.recent]
keep_turns = 30
max_total_bytes = 500000
store_raw = true

[compaction.mid]
trigger_turns = 30
target_items = 10
target_max_words_per_item = 40
include_categories = [
  "decisions",
  "constraints",
  "open_questions",
  "files_discussed",
  "commands_discussed",
  "risks",
  "next_steps",
  "rejected_options",
]

[compaction.long]
promote_after_mid_items = 50
target_items = 10
max_items = 100
on_limit = "recompact_oldest"

[compaction.raw_retention]
max_age_days = 14
max_total_mb = 250
on_limit = "prune_after_compaction"

[compaction.rules]
require_source_refs = true
summaries_are_derived = true
current_files_override_summaries = true
never_store_secrets = true
scrub_absolute_user_paths = true
do_not_store_hidden_chain_of_thought = true
```

`compaction` declara cómo una sesión larga puede separar el contexto en entrada reciente sin procesar, resúmenes intermedios y resúmenes de largo plazo. Está desactivada de forma predeterminada y no significa que mustflow recopile transcripciones completas de chat.

`state_store = "cache"` significa que el estado de compactación debe vivir en caché local o en estado gestionado por el anfitrión, no en documentos versionados del proyecto. El conocimiento compartido del proyecto solo debe promoverse como decisiones, investigaciones o resúmenes de traspaso vinculados a fuentes.

`compaction.rules` mantiene los resúmenes con menor autoridad que las instrucciones actuales del usuario, el código y la configuración actuales, los contratos de comando y los recibos de ejecución.

El idioma de los resúmenes de compactación y de traspaso no se controla aquí. Pertenece a `.mustflow/config/preferences.toml`, bajo `[language.memory]`.

## Campos de relevancia de pruebas

```toml
[testing]
policy = "behavior_contract"
prefer_update_existing_tests = true
require_existing_test_search = true
require_test_change_report = true
forbid_validation_weakening = true
allow_test_deletion_when = [
  "behavior_removed",
  "public_contract_changed",
  "duplicate_coverage",
  "implementation_detail_removed",
  "obsolete_snapshot",
]
forbid_test_deletion_when = [
  "only_to_make_tests_pass",
  "without_behavior_rationale",
  "without_reporting",
  "without_running_relevant_validation",
]
stale_test_action = "update_remove_or_report"
```

`testing.policy = "behavior_contract"` significa que las pruebas validan el comportamiento previsto actual. No significa que las pruebas deban crecer indefinidamente ni preservar funciones eliminadas.

`require_existing_test_search` indica a los agentes que inspeccionen las pruebas existentes antes de agregar nuevas.
`allow_test_deletion_when` y `forbid_test_deletion_when` definen el límite entre eliminar pruebas obsoletas y debilitar la validación.

`stale_test_action = "update_remove_or_report"` significa que los candidatos obsoletos deben actualizarse, eliminarse o informarse; no borrarse automáticamente.

## Campos de presupuesto, aprobación y aislamiento

```toml
[budget]
enabled = true
max_iterations = 10
max_wall_clock_minutes = 120
max_command_runs = 50
max_total_output_mb = 20
max_failures_per_intent = 3
on_limit = "stop_and_handoff"

[approval]
required_for = [
  "git_commit",
  "git_push",
  "dependency_install",
  "dependency_upgrade",
  "network_access",
  "database_migration",
  "destructive_command",
  "secret_access",
  "release",
  "cross_repository_change",
]
on_required = "stop_and_request_approval"

[isolation]
preferred = "git_worktree"
required_for_long_running = true
allow_dirty_main_worktree = false
```

`budget` evita bucles ilimitados al limitar iteraciones, tiempo transcurrido, ejecuciones de comandos, volumen de salida y fallos repetidos. Cuando se alcanza el límite, los agentes se detienen e informan o traspasan el trabajo.

`approval` enumera acciones que necesitan aprobación humana explícita antes de ejecutarse. No concede permiso por sí mismo.

`isolation` declara el límite preferido para trabajo de larga duración. mustflow no crea por sí mismo el árbol de trabajo ni el sandbox; entrega a las herramientas anfitrionas una política que seguir.

`mf check` valida estos campos como contratos, pero no ejecuta un sistema de agentes de larga duración.

## Campos de retención

```toml
[retention]
enabled = true

[retention.raw_events]
store = "none"
max_file_mb = 25
max_total_mb = 250
max_age_days = 14
on_limit = "report"

[retention.run_receipts]
store = "project"
max_file_kb = 128
max_items = 1
max_total_mb = 1
keep_stdout_tail_bytes = 65536
keep_stderr_tail_bytes = 65536

[retention.knowledge]
enabled = false
store = "project"
max_file_kb = 128
max_total_mb = 10
require_source_refs = true
require_review_status = true

[retention.context]
max_file_kb = 8

[retention.handoffs]
store = "project"
max_file_kb = 64
max_total_mb = 5
require_source_refs = true

[retention.repo_map]
max_file_kb = 128
fail_if_larger = true
```

`retention` evita que mustflow acumule transcripciones completas de chat, salida completa de terminal o flujos de eventos JSONL sin procesar dentro del proyecto.

`raw_events.store = "none"` significa que la plantilla predeterminada no almacena registros de eventos sin procesar. Si más adelante se agrega almacenamiento en caché, debe permanecer separado de los documentos del proyecto que puedan confirmarse.

`run_receipts` limita `.mustflow/state/runs/latest.json`, que escribe `mf run`.
Un recibo de ejecución debe contener resultados estructurados pequeños y colas de salida, no el registro completo.

`knowledge.enabled = false` significa que la plantilla predeterminada no crea una base de conocimiento. Si se habilita más adelante, los archivos de conocimiento deben contener decisiones, investigaciones y resúmenes de traspaso, no registros sin procesar.

`context` limita los archivos `.mustflow/context/*.md`. Estos archivos deben mantenerse breves y orientados a tareas en lugar de convertirse en un archivo de documentación. `mf check --strict` también comprueba que no contengan rutas absolutas locales, texto clave/valor similar a secretos ni definiciones de variables de diseño duplicadas desde `DESIGN.md`.

`handoffs` limita registros compactos opcionales de traspaso. Los traspasos no son registros de sesión sin procesar; deben referenciar fuentes como recibos de ejecución y resumir el siguiente paso seguro.

`repo_map` limita el `REPO_MAP.md` generado. El mapa debe contener anclas de navegación, no una lista completa de archivos ni un registro de cambios recientes.

`mf check --strict` comprueba que esta política exista, que los archivos generados permanezcan bajo sus límites y que no aparezcan archivos JSONL sin procesar bajo `.mustflow/**`.

Vive bajo `.mustflow/` para no mezclarse con la configuración ordinaria del proyecto.

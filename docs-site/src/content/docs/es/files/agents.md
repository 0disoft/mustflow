---
title: AGENTS.md
description: Punto de entrada breve de reglas de trabajo en la raíz que los agentes leen primero.
---

`AGENTS.md` es el punto de entrada raíz que los agentes LLM leen primero al entrar en un repositorio.

## Dónde se usa

`mf init` crea este archivo en la raíz del repositorio de destino para que los agentes puedan encontrarlo de inmediato al entrar en el repositorio.

Es el punto de entrada al flujo de documentos de mustflow. La política detallada pertenece a `.mustflow/docs/agent-workflow.md`, los comandos ejecutables pertenecen a `.mustflow/config/commands.toml`, las preferencias de nivel de repositorio pertenecen a `.mustflow/config/preferences.toml`, el contexto de proyecto específico de una tarea pertenece a `.mustflow/context/` y los procedimientos repetibles pertenecen a `.mustflow/skills/`.

## Función

- Inicia el flujo de documentos de mustflow.
- Define el primer orden de lectura.
- Mantiene solo reglas absolutas, como no adivinar comandos, preservar cambios existentes y manejar secretos.
- Remite el flujo de trabajo detallado a `.mustflow/docs/agent-workflow.md`.
- Hace que la ejecutabilidad dependa del estado de la intención de comando en `.mustflow/config/commands.toml`.
- Indica que `mf doctor` es un comando de diagnóstico de solo lectura que se puede ejecutar antes de editar cuando haga falta.
- Indica que `mf context --json` es un índice de contexto de solo lectura, no un reemplazo de leer los documentos reales.
- Remite las tareas largas o sensibles a `[budget]`, `[approval]` e `[isolation]` en `mustflow.toml`.

## Orden de lectura

```text
AGENTS.md
.mustflow/docs/agent-workflow.md
.mustflow/config/mustflow.toml
.mustflow/config/commands.toml
.mustflow/config/preferences.toml  # cuando exista
.mustflow/skills/INDEX.md
.mustflow/context/INDEX.md  # solo cuando se necesite contexto específico de la tarea
.mustflow/context/<name>.md  # solo cuando lo seleccione el índice de contexto
.mustflow/skills/<name>/SKILL.md
REPO_MAP.md  # solo cuando se necesite navegación amplia
```

## Frontmatter

```yaml
mustflow_doc: agents.root
locale: en
canonical: true
revision: 4
```

- `mustflow_doc`: identificador estable del documento dentro de mustflow.
- `locale`: idioma del documento.
- `canonical`: indica si este documento es la fuente canónica.
- `revision`: revisión canónica del documento.

La plantilla inglesa de `AGENTS.md` es la fuente canónica. Los archivos de plantilla localizados usan su propia configuración regional y establecen `canonical: false`.

## Reglas de autoría

`AGENTS.md` permanece en la raíz del repositorio para que los agentes puedan descubrirlo rápido.

No codifiques en `AGENTS.md` comandos reales de prueba o compilación, árboles del repositorio, cambios recientes ni marcas de tiempo generadas. Esos detalles reducen la estabilidad de entrada y pertenecen a `commands.toml`, `REPO_MAP.md` o a los archivos fuente pertinentes.

Los valores predeterminados de idioma, comentarios, mensajes de commit, documentación, registros y formato pertenecen a `.mustflow/config/preferences.toml`, no a texto largo dentro de `AGENTS.md`.

Los bucles autónomos, flotas de procesos de trabajo, sistemas de perfiles de agente y sistemas de ejecución de larga duración no deben iniciarse desde `AGENTS.md`. Si un repositorio quiere esas superficies, debe declararlas explícitamente en la configuración de mustflow y en los documentos de apoyo.

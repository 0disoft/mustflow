---
title: .mustflow/skills/*/SKILL.md
description: Documento de procedimiento para tareas repetibles de agentes.
---

`.mustflow/skills/*/SKILL.md` ayuda a los agentes a realizar tareas repetibles sin adivinar.

## Dónde se usa

Los agentes eligen una skill relevante desde `.mustflow/skills/INDEX.md` y luego leen esa skill antes de hacer trabajo repetible.

Los documentos de skill cubren procedimientos como revisión de código, mantenimiento de pruebas, análisis de fallos y actualizaciones de documentación. Hacen referencia a `.mustflow/docs/agent-workflow.md` en lugar de copiar la política compartida.

Activar una skill significa leer y seguir su procedimiento. No concede permiso para ejecutar comandos
fuera de `.mustflow/config/commands.toml` ni para ignorar instrucciones de mayor prioridad.

## Frontmatter

```yaml
mustflow_doc: skill.code-review
locale: en
canonical: true
revision: 1
name: code-review
description: Usar al revisar cambios de código, alcance, riesgos o verificación faltante.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.code-review
  command_intents:
    - test
    - lint
```

- `mustflow_doc`: identificador estable de la skill dentro de mustflow.
- `locale`: idioma del documento.
- `canonical`: indica si este documento es la fuente canónica.
- `revision`: revisión canónica del documento.
- `name`: nombre de la skill. Debe coincidir con la carpeta `.mustflow/skills/<name>/`.
- `description`: cuándo debe leer el agente esta skill.
- `metadata.mustflow_schema`: versión de la forma de metadatos de la skill. El valor admitido actualmente es `"1"`.
- `metadata.mustflow_kind`: tipo de documento. Las skills predeterminadas deben usar `procedure`.
- `metadata.pack_id`: espacio de nombres del paquete o pack propietario de la skill, por ejemplo `mustflow.core`.
- `metadata.skill_id`: identificador global de la skill. Debe combinar el identificador del pack y el nombre de la carpeta, por ejemplo `mustflow.core.code-review`.
- `metadata.command_intents`: nombres de intención de comando que esta skill puede referenciar. Cada nombre debe existir en `.mustflow/config/commands.toml`.

La plantilla inglesa de skill es la fuente canónica. Las plantillas localizadas de skill usan su propia configuración regional y establecen `canonical: false`.

## Secciones estándar

Cada documento de skill debe incluir:

- `Propósito`: la tarea que aborda esta skill.
- `Cuándo usar`: situaciones que deben activar esta skill.
- `Cuándo no usar`: exclusiones que evitan su uso excesivo.
- `Entradas requeridas`: información que los agentes deben reunir antes de actuar.
- `Procedimiento`: secuencia de trabajo.
- `Validación`: intenciones de comando y comprobaciones relevantes.
- `Manejo de fallos`: qué hacer cuando fallan comandos o falta información.
- `Contrato de salida`: elementos que se deben incluir en el informe final.

## Reglas de autoría

Cada skill debe cubrir un tipo de tarea.

No escribas comandos de terminal sin procesar en documentos de skill. En la sección de validación, referencia `.mustflow/docs/agent-workflow.md#command-execution-policy` y enumera solo los nombres de intención de comando relevantes.

Resuelve cada intención mediante `.mustflow/config/commands.toml`. Si `status = "configured"` no está presente, no la ejecutes; informa el estado y el motivo de omisión.

No escribas que una skill concede permiso para ejecutar comandos. Las skills describen el procedimiento; `.mustflow/config/commands.toml` sigue siendo la única fuente para los permisos de comandos ejecutables.

Ejemplo:

```md
## Validación

Intenciones de comando relevantes:

- `test`
- `lint`

Resuelve cada intención mediante `.mustflow/config/commands.toml`.
```

## Recursos de apoyo

Una skill predeterminada empieza solo con `SKILL.md`. No crees por adelantado carpetas vacías `references/`, `assets/` o `scripts/`.

Cuando una skill se vuelve larga o necesita material de apoyo separado, agrega un `resources.toml` opcional y registra allí referencias, plantillas o scripts. Los scripts no deben invocarse mediante rutas adivinadas; conéctalos a intenciones de comando en `.mustflow/config/commands.toml`.

Sigue [Recursos de skills](../../design/skill-resources/) para ver las reglas detalladas.

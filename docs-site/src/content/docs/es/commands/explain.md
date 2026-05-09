---
title: mf explain
description: Comando de solo lectura para explicar por qué se aplican decisiones de política de mustflow.
---

`mf explain authority [path]` explica cómo mustflow clasifica la autoridad de Markdown administrado. No modifica archivos y no cuenta como verificación del proyecto.

Sin una ruta, el comando imprime el modelo de autoridad. Con una ruta, informa si esa ruta tiene un rol de documento mustflow esperado.

`mf explain asset-optimization` explica la ruta de decisión para optimizar imágenes web. Informa si se aplica el skill `web-asset-optimization` y si `asset_optimize` es una intención de comando configurada y ejecutable por el agente, para que el agente no adivine convertidores de imágenes ni comandos de paquetes.

`mf explain anchor <anchor_id>` explica un ancla estructurada de código fuente. Las anclas de código son coordenadas solo de navegación: ayudan a encontrar código, pero no definen reglas de flujo de trabajo, permisos de comando ni autoridad de verificación.

`mf explain command <intent>` explica si una intención de comando en `.mustflow/config/commands.toml` puede ejecutarse con `mf run`, por qué se permite o se bloquea, y si su ejecución contaría como verificación de mustflow.

`mf explain retention` explica la política de retención efectiva de `.mustflow/config/mustflow.toml`, incluida la forma de guardar eventos sin procesar, los recibos de ejecución acotados y los límites de contexto.

`mf explain skill <skill_id>` explica una ruta de `.mustflow/skills/INDEX.md`, incluidos el disparador, la entrada requerida, el alcance de edición, el riesgo, las intenciones de verificación y la salida esperada. El objetivo puede ser el nombre de carpeta, el `metadata.skill_id` completo, `mustflow_doc` o la ruta del skill.

`mf explain skills` explica el resumen estricto de alineación entre el índice de skills y sus cuerpos que usa `mf doctor --strict`. Informa si cada ruta de `.mustflow/skills/INDEX.md` apunta a un cuerpo de skill y si cada cuerpo está listado en el índice.

## Salida

- `mustflow root`: raíz mustflow actual.
- `Topic`: tema de explicación.
- `Decision`: decisión de política resuelta.
- `Reason`: motivo por el que aplica la decisión.
- `Effective action`: acción que debe tomar un agente.
- `Counts as mustflow verification`: si el resultado cuenta como recibo de verificación.
- `Source files`: archivos que definen la fuente de la regla.
- `Source anchor`: ruta, línea, propósito, términos de búsqueda, invariante, riesgo y autoridad solo de navegación cuando se usa el tema `anchor`.
- `Expected frontmatter`: valores requeridos de `mustflow_doc`, `authority` y `lifecycle` cuando la ruta se reconoce.
- `Authority boundary`: lo que esa autoridad puede definir y lo que debe dejar a archivos de mayor autoridad, al código actual o a `commands.toml`.
- `Command intent`: metadatos del contrato de comando cuando se usa el tema `command`.
- `Retention policy`: ajustes de retención efectivos cuando se usa el tema `retention`.
- `Skill route`: disparador, alcance, riesgo, verificaciones y salida esperada cuando se usa el tema `skill`.
- `Skill routes`: estado estricto de alineación entre índice y cuerpo cuando se usa el tema `skills`.

## Ejemplos

```sh
npx mf explain authority
npx mf explain authority AGENTS.md
npx mf explain anchor auth.session.resolve
npx mf explain anchor auth.session.resolve --json
npx mf explain asset-optimization
npx mf explain asset-optimization --json
npx mf explain command test
npx mf explain command lint --json
npx mf explain retention
npx mf explain retention --json
npx mf explain skill code-review
npx mf explain skill mustflow.core.code-review --json
npx mf explain skills
npx mf explain skills --json
npx mf explain authority .mustflow/skills/INDEX.md --json
```

## Campos JSON

```sh
npx mf explain authority AGENTS.md --json
```

La salida legible por máquinas usa estos campos:

- `schema_version` (`string`): versión del formato de salida.
- `command` (`string`): siempre `explain`.
- `topic` (`string`): `anchor`, `asset-optimization`, `authority`, `command`, `retention`, `skill`, `skills` o `surface`.
- `mustflow_root` (`string`): raíz mustflow actual.
- `decision` (`object`): decisión resuelta, motivo, acción efectiva, archivos fuente, estado de verificación y detalles específicos del tema. Para `authority`, incluye `boundary.role`, `boundary.canDefine` y `boundary.cannotDefine`.

## Ayuda y códigos de salida

```sh
npx mf explain --help
```

- Código `0`: la decisión de autoridad se inspeccionó e imprimió.
- Código `1`: el comando recibió un tema inválido, una opción desconocida o un argumento inesperado.

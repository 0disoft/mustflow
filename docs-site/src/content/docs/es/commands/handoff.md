---
title: mf handoff
description: Validación de solo lectura para registros restringidos de trabajo y handoff.
---

`mf handoff validate <path>` valida un registro JSON dentro de la raíz mustflow. No crea elementos de trabajo, no escribe archivos de handoff, no inicia agentes, no ejecuta comandos y no trata el registro como autoridad de comandos.

El comando sirve para archivos opcionales bajo `.mustflow/work-items/` o registros de handoff que funcionan como puntos de reinicio. Un registro válido puede nombrar objetivo, alcance, criterios de aceptación, referencias de origen, plan de verificación, estado de cobertura, riesgos restantes y siguiente punto de reinicio. No puede guardar razonamiento oculto, transcripciones de chat, logs crudos de terminal, secretos, datos personales, resúmenes amplios de memoria, estado de trabajadores autónomos ni campos de comando que evadan `.mustflow/config/commands.toml`.

## Shape

Required fields:

- `schema_version`: Always `1`.
- `kind`: `work_item` or `handoff`.
- `task_id`: Stable task identifier.
- `goal`: Current goal.
- `scope`: Bounded work scope.
- `acceptance_criteria`: Completion checks.
- `source_refs`: Repository files, issue links, or other source references.
- `next_restart_point`: Short instruction for the next session.

Optional fields: `non_goals`, `changed_surfaces`, `verification_plan`, `coverage`, and `remaining_risks`.

`verification_plan` entries use `status: planned`, `run`, or `skipped`. Skipped entries must include `skip_reason`. Only `status: run` entries may include `receipt_path`.

## Example

```sh
npx mf handoff validate .mustflow/work-items/MF-0001.json
npx mf handoff validate .mustflow/work-items/MF-0001.json --json
```

## Exit Codes

- `0`: The record is valid.
- `1`: The record is invalid, outside the mustflow root, too large, unreadable, or not valid JSON.

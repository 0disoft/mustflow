---
mustflow_doc: skills.index
locale: es
canonical: false
revision: 6
---

# Indice De Skills

Consulta solo el documento de skill relevante para la tarea actual. Si no aplica ninguna skill especifica,
consulta `AGENTS.md` y `.mustflow/config/commands.toml` para implementar el cambio seguro mas minimo.

## Reglas De Seleccion

- Al iniciar una tarea y antes de la primera edicion, compara la solicitud del usuario y los archivos
  que se espera cambiar con los escenarios siguientes.
- Si uno o mas escenarios coinciden, lee cada `SKILL.md` correspondiente antes de editar ese alcance.
- Si aparece una nueva condicion durante la tarea, como un fallo de comando, un cambio de contrato de
  pruebas o un cambio de documentacion, pausa y lee la skill que ahora coincide antes de continuar.
- Si ningun escenario aplica, no inventes una skill. Continua con `AGENTS.md`,
  `.mustflow/docs/agent-workflow.md` y `.mustflow/config/commands.toml`.
- Los documentos de skill solo guian el procedimiento. No autorizan ejecucion de comandos fuera de
  los command intents declarados.

| Escenario | Documento De Skill | Command Intents Relacionados |
| --- | --- | --- |
| Revisar cambios de codigo | `.mustflow/skills/code-review/SKILL.md` | `test`, `test_related`, `test_audit`, `lint` |
| Agregar, actualizar, eliminar o auditar pruebas | `.mustflow/skills/test-maintenance/SKILL.md` | `test`, `test_related`, `test_audit`, `snapshot_update`, `lint`, `build` |
| Investigar un fallo | `.mustflow/skills/failure-triage/SKILL.md` | El intent original que fallo |
| Completar o mantener `.mustflow/context/PROJECT.md` | `.mustflow/skills/project-context-authoring/SKILL.md` | `mustflow_check` |
| Crear o mantener procedimientos `.mustflow/skills/*/SKILL.md` | `.mustflow/skills/skill-authoring/SKILL.md` | `mustflow_check`, `docs_validate` |
| Agregar, convertir, redimensionar o reemplazar imagenes web | `.mustflow/skills/web-asset-optimization/SKILL.md` | `asset_optimize`, `build` |
| Actualizar documentacion | `.mustflow/skills/docs-update/SKILL.md` | `docs_validate`, `mustflow_check` |

Al introducir una skill nueva, enlazala aqui y define los escenarios especificos de uso.
Evita incluir comandos de shell crudos en documentos de skill; en su lugar, referencia los nombres
de command intent tal como se definen en `.mustflow/config/commands.toml`.

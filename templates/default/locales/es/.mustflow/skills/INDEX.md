---
mustflow_doc: skills.index
locale: es
canonical: false
revision: 2
---

# Indice De Skills

Consulta solo el documento de skill relevante para la tarea actual. Si no aplica ninguna skill especifica,
consulta `AGENTS.md` y `.mustflow/config/commands.toml` para implementar el cambio seguro mas minimo.

| Escenario | Documento De Skill | Command Intents Relacionados |
| --- | --- | --- |
| Revisar cambios de codigo | `.mustflow/skills/code-review/SKILL.md` | `test`, `test_related`, `test_audit`, `lint` |
| Agregar, actualizar, eliminar o auditar pruebas | `.mustflow/skills/test-maintenance/SKILL.md` | `test`, `test_related`, `test_audit`, `snapshot_update`, `lint`, `build` |
| Investigar un fallo | `.mustflow/skills/failure-triage/SKILL.md` | El intent original que fallo |
| Actualizar documentacion | `.mustflow/skills/docs-update/SKILL.md` | `docs_validate`, `mustflow_check` |

Al introducir una skill nueva, enlazala aqui y define los escenarios especificos de uso.
Evita incluir comandos de shell crudos en documentos de skill; en su lugar, referencia los nombres
de command intent tal como se definen en `.mustflow/config/commands.toml`.

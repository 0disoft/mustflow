---
mustflow_doc: skills.index
locale: es
canonical: false
revision: 7
---

# Indice de skills

Consulta solo el documento de skill relevante para la tarea actual. Si no aplica ninguna skill,
usa `AGENTS.md` y `.mustflow/config/commands.toml` para hacer el cambio seguro mas pequeno.

## Reglas de seleccion

- Al iniciar la tarea y antes de la primera edicion, compara la solicitud del usuario y los archivos previstos con los disparadores siguientes.
- Si coincide uno o mas disparadores, lee cada `SKILL.md` antes de editar ese alcance.
- Si aparece una nueva condicion durante la tarea, como una falla de comando, cambio de contrato de pruebas o cambio documental, detente y lee la skill correspondiente antes de continuar.
- Si no aplica ningun disparador, no inventes una skill. Continua con `AGENTS.md`, `.mustflow/docs/agent-workflow.md` y `.mustflow/config/commands.toml`.
- Los documentos de skill solo guian procedimientos. No autorizan ejecutar comandos fuera de los intentos declarados.
- Mantener compacta la tabla de rutas: cada ruta declara disparador, entrada requerida, alcance de edicion, riesgo, intentos de verificacion y salida esperada.

| Disparador | Documento de skill | Entrada requerida | Alcance de edicion | Riesgo | Intentos de verificacion | Salida esperada |
| --- | --- | --- | --- | --- | --- | --- |
| Los cambios de codigo necesitan revision antes del informe | `.mustflow/skills/code-review/SKILL.md` | Diff y objetivo de la tarea | Archivos modificados | comportamiento y regresion | `test`, `test_related`, `test_audit`, `lint` | Hallazgos o nota sin problemas |
| Se agregan, actualizan, eliminan o auditan pruebas | `.mustflow/skills/test-maintenance/SKILL.md` | Comportamiento cambiado o evidencia de prueba obsoleta | Pruebas y fuente relacionada | deriva de contrato | `test`, `test_related`, `test_audit`, `snapshot_update`, `lint`, `build` | Razon de pruebas y verificacion |
| Falla un intento de comando configurado o un paso de verificacion | `.mustflow/skills/failure-triage/SKILL.md` | Intento fallido y cola de salida | Solo causa de la falla | diagnostico erroneo | `mustflow_check`; intento fallido original | Causa, correccion y resultado de repeticion |
| `.mustflow/context/PROJECT.md` necesita contexto prudente | `.mustflow/skills/project-context-authoring/SKILL.md` | Hechos del proyecto con evidencia | `.mustflow/context/PROJECT.md` | deriva de autoridad | `mustflow_check` | Contexto prudente actualizado |
| Se crean o mantienen procedimientos o rutas de skills | `.mustflow/skills/skill-authoring/SKILL.md` | Evidencia de tarea repetida | `.mustflow/skills/**` | solapamiento y deriva de comandos | `mustflow_check`, `docs_validate` | Cambios de ruta y procedimiento |
| Se agregan, convierten, redimensionan o reemplazan imagenes web | `.mustflow/skills/web-asset-optimization/SKILL.md` | Solicitud de imagen y ruta destino | Imagenes web | calidad y tamano del recurso | `asset_optimize`, `build` | Notas de recurso optimizado |
| Cambios documentales afectan docs publicas o de flujo | `.mustflow/skills/docs-update/SKILL.md` | Comportamiento o campo cambiado | Solo docs relevantes | docs publicas obsoletas | `docs_validate`, `mustflow_check` | Cambios documentales y verificaciones omitidas |

Al introducir una nueva skill, enlazala aqui y define el disparador y los campos de ruta concretos.
Evita incluir comandos shell sin procesar; referencia los nombres de intentos definidos en `.mustflow/config/commands.toml`.
---
mustflow_doc: skill.code-review
locale: es
canonical: false
revision: 2
name: code-review
description: Aplica esta skill al revisar cambios de codigo, alcance, riesgos o brechas de verificacion.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  command_intents:
    - test
    - test_related
    - test_audit
    - lint
---

# Revision De Codigo

## Proposito

Verificar que un cambio se alinee con la solicitud y asegurar que no queden riesgos de comportamiento ni brechas de verificacion.

## Usar Cuando

- Cambios de codigo, diferencias, solicitudes de extraccion o riesgos potenciales de regresion requieran revision.
- El objetivo principal sea evaluar riesgos en lugar de implementar comportamiento nuevo.

## No Usar Cuando

- La tarea solo implique cambios de redaccion, traduccion o formato.
- No haya archivos cambiados ni diferencias disponibles para revisar.

## Entradas Requeridas

- Archivos modificados o diferencias
- Criterios de revision especificados por el usuario
- `AGENTS.md`
- `.mustflow/docs/agent-workflow.md`
- `.mustflow/config/commands.toml`

## Procedimiento

1. Revisa la lista de archivos modificados.
2. Identifica ediciones no relacionadas o sobrantes.
3. Evalua el impacto sobre comportamiento, configuracion, comandos y documentacion.
4. Revisa la relevancia de pruebas:
   - pruebas faltantes para funcionalidad nueva
   - pruebas obsoletas de funcionalidad eliminada
   - pruebas redundantes que no cubren riesgos nuevos
   - aserciones debilitadas o insuficientes
   - actualizaciones de snapshots sin una justificacion clara
   - pruebas que reintroducen comportamiento eliminado de forma inadvertida
5. Verifica la existencia de command intents relevantes.
6. Documenta hallazgos categorizados por severidad.

## Verificacion

Sigue `.mustflow/docs/agent-workflow.md#command-execution-policy`.

Command intents relacionados:

- `test`
- `test_related`
- `test_audit`
- `lint`

Evita introducir comandos crudos de shell; referencia los nombres de command intent definidos en `.mustflow/config/commands.toml`.

## Manejo De Fallos

- Si un command intent falta, esta restringido a ejecucion manual, esta deshabilitado o es desconocido, reporta el estado en lugar de adivinar.
- Documenta cualquier verificacion omitida y los riesgos remanentes asociados.
- Deten el proceso de inmediato y reporta si se identifican datos sensibles o riesgos de comandos destructivos.

## Formato De Salida

- Resumen
- Hallazgos categorizados por severidad
- Lista de archivos revisados
- Command intents ejecutados
- Command intents omitidos y sus justificaciones
- Notas sobre relevancia de pruebas
- Riesgos remanentes identificados

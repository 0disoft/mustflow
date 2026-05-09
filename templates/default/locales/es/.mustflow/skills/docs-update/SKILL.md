---
mustflow_doc: skill.docs-update
locale: es
canonical: false
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: docs-update
description: Aplica esta skill al actualizar documentacion de mustflow o del proyecto.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.docs-update
  command_intents:
    - docs_validate
    - mustflow_check
---

# Actualizacion De Documentacion

<!-- mustflow-section: purpose -->
## Proposito

Asegurar que la documentacion refleje con precision el flujo de trabajo actual, los comandos y el comportamiento visible para usuarios.

<!-- mustflow-section: use-when -->
## Usar Cuando

- Se modifiquen archivos del flujo de trabajo de agentes.
- Se actualicen contratos de comandos o campos de configuracion.
- Cambie comportamiento visible para usuarios y se requiera actualizar documentacion.

<!-- mustflow-section: do-not-use-when -->
## No Usar Cuando

- La tarea involucre solo detalles privados de implementacion.
- El usuario solicite de forma explicita no modificar documentacion.

<!-- mustflow-section: required-inputs -->
## Entradas Requeridas

- Comportamiento modificado o campo de configuracion cambiado
- Archivo fuente o plantilla relevante
- Pagina de documentacion actual o archivo Markdown
- `.mustflow/config/commands.toml`

<!-- mustflow-section: preconditions -->
## Precondiciones

- La tarea coincide con las condiciones de uso y no coincide con las exclusiones.
- Las entradas requeridas estan disponibles, o las entradas faltantes pueden reportarse sin adivinar.
- Las instrucciones de mayor prioridad y `.mustflow/config/commands.toml` se revisaron para el alcance actual.

<!-- mustflow-section: allowed-edits -->
## Ediciones Permitidas

- Mantener las ediciones dentro del alcance descrito por esta skill, la solicitud del usuario y la ruta coincidente en `.mustflow/skills/INDEX.md`.
- No ampliar permisos de comando, inventar hechos del proyecto ni cambiar archivos de workflow no relacionados.

<!-- mustflow-section: procedure -->
## Procedimiento

1. Localiza el documento responsable de la explicacion.
2. Actualiza solo las secciones mas relevantes.
3. Asegura que nombres de comandos y rutas sean exactos.
4. Evita agregar lenguaje de marketing o relleno tipo tutorial.
5. No modifiques manualmente archivos generados.

<!-- mustflow-section: postconditions -->
## Postcondiciones

- La salida esperada puede producirse con evidencia clara, intentos de comando ejecutados, verificaciones omitidas y riesgos restantes.
- Cualquier intento de comando faltante, entrada desconocida o conflicto de autoridad se reporta en lugar de ocultarse.

<!-- mustflow-section: verification -->
## Verificacion

Ejecuta `docs_validate` y `mustflow_check` siempre que esten configurados y disponibles para uso del agente.
De lo contrario, reporta la razon por la que se omiten esas comprobaciones.

<!-- mustflow-section: failure-handling -->
## Manejo De Fallos

- Si la validacion de documentacion falla, corrige el primer enlace roto o error de sintaxis relevante.
- Si cambio un contrato de comando, verifica consistencia entre la documentacion y `.mustflow/config/commands.toml`.
- Si el estado de traduccion no esta claro, marca el documento para revision en lugar de adivinar si esta al dia.

<!-- mustflow-section: output-format -->
## Formato De Salida

- Documentos modificados
- Comportamiento o campos documentados
- Command intents ejecutados
- Comprobaciones omitidas y razones
- Acciones de traduccion pendientes

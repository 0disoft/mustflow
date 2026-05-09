---
mustflow_doc: skill.failure-triage
locale: es
canonical: false
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: failure-triage
description: Aplica esta skill cuando falle un command intent configurado o un paso de verificacion.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.failure-triage
  command_intents:
    - mustflow_check
---

# Diagnostico De Fallos

<!-- mustflow-section: purpose -->
## Proposito

Identificar la causa raiz mas probable de un comando o paso de verificacion fallido antes de modificar archivos.

<!-- mustflow-section: use-when -->
## Usar Cuando

- Un command intent configurado devuelve un codigo de salida distinto de cero.
- Fallen comprobaciones de validacion, compilacion, pruebas o documentacion.
- La causa raiz del fallo aun no sea evidente.

<!-- mustflow-section: do-not-use-when -->
## No Usar Cuando

- El fallo se entienda por completo y ya exista una correccion dirigida.
- El usuario haya pedido solo un resumen de alto nivel.

<!-- mustflow-section: required-inputs -->
## Entradas Requeridas

- Command intent original
- Codigo de salida
- Salida truncada de stdout y stderr
- Archivos modificados recientemente
- Entrada relevante del contrato de comandos

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

1. Conserva el nombre original del intent que fallo.
2. Analiza el primer error accionable.
3. Determina si el fallo proviene de codigo, pruebas, configuracion, documentacion o del entorno.
4. Examina los archivos mas relevantes.
5. Formula una sola hipotesis y verificala usando el intent configurado mas dirigido.

<!-- mustflow-section: postconditions -->
## Postcondiciones

- La salida esperada puede producirse con evidencia clara, intentos de comando ejecutados, verificaciones omitidas y riesgos restantes.
- Cualquier intento de comando faltante, entrada desconocida o conflicto de autoridad se reporta en lugar de ocultarse.

<!-- mustflow-section: verification -->
## Verificacion

Vuelve a ejecutar el intent original que fallo cuando sea posible. Si eso es demasiado amplio, ejecuta el intent
configurado mas dirigido que aisle la misma area de fallo.

<!-- mustflow-section: failure-handling -->
## Manejo De Fallos

- Evita agrupar correcciones no relacionadas.
- Si el fallo se debe a herramientas faltantes, reporta la herramienta faltante y el comando que revelo el problema.
- Si aparecen datos sensibles en la salida, deja de copiar salida cruda y resume la informacion de forma segura.

<!-- mustflow-section: output-format -->
## Formato De Salida

- Intent fallido
- Causa raiz probable
- Evidencia
- Correccion aplicada o recomendada
- Verificacion ejecutada
- Riesgo remanente

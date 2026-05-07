---
mustflow_doc: skill.failure-triage
locale: es
canonical: false
revision: 1
name: failure-triage
description: Aplica esta skill cuando falle un command intent configurado o un paso de verificacion.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  command_intents:
    - mustflow_check
---

# Diagnostico De Fallos

## Proposito

Identificar la causa raiz mas probable de un comando o paso de verificacion fallido antes de modificar archivos.

## Usar Cuando

- Un command intent configurado devuelve un codigo de salida distinto de cero.
- Fallen comprobaciones de validacion, compilacion, pruebas o documentacion.
- La causa raiz del fallo aun no sea evidente.

## No Usar Cuando

- El fallo se entienda por completo y ya exista una correccion dirigida.
- El usuario haya pedido solo un resumen de alto nivel.

## Entradas Requeridas

- Command intent original
- Codigo de salida
- Salida truncada de stdout y stderr
- Archivos modificados recientemente
- Entrada relevante del contrato de comandos

## Procedimiento

1. Conserva el nombre original del intent que fallo.
2. Analiza el primer error accionable.
3. Determina si el fallo proviene de codigo, pruebas, configuracion, documentacion o del entorno.
4. Examina los archivos mas relevantes.
5. Formula una sola hipotesis y verificala usando el intent configurado mas dirigido.

## Verificacion

Vuelve a ejecutar el intent original que fallo cuando sea posible. Si eso es demasiado amplio, ejecuta el intent
configurado mas dirigido que aisle la misma area de fallo.

## Manejo De Fallos

- Evita agrupar correcciones no relacionadas.
- Si el fallo se debe a herramientas faltantes, reporta la herramienta faltante y el comando que revelo el problema.
- Si aparecen datos sensibles en la salida, deja de copiar salida cruda y resume la informacion de forma segura.

## Formato De Salida

- Intent fallido
- Causa raiz probable
- Evidencia
- Correccion aplicada o recomendada
- Verificacion ejecutada
- Riesgo remanente

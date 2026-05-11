---
mustflow_doc: context.index
kind: mustflow-context
locale: es
canonical: false
revision: 1
lifecycle: mustflow-owned
name: context-index
authority: router
stability: medium
review_status: needs_human_review
---

# Índice de Contexto

Consulta este archivo para identificar qué archivos de contexto del proyecto son relevantes para la tarea actual.  
Evita leer todos los archivos de contexto por defecto para minimizar el ruido.

## Contexto Disponible

| Contexto | Usar cuando | Ruta |
| --- | --- | --- |
| project | La tarea puede afectar la dirección del proyecto, el alcance, el comportamiento público, los no-objetivos o convenciones de todo el repositorio. | `.mustflow/context/PROJECT.md` |

## Referencias Externas Opcionales

| Ancla | Usar cuando | Ruta |
| --- | --- | --- |
| human overview | Se requiere una visión pública del proyecto o una guía de instalación. Trátalo como contexto general y no como política obligatoria. | `README.md` |
| roadmap | Se necesita contexto sobre planificación, prioridades, hitos o no-objetivos del proyecto. Trátalo como contexto de planificación, no como política mustflow instalada. | `ROADMAP.md` |
| visual design | La tarea implica cambios en la interfaz, identidad visual, tokens de diseño, maquetación o accesibilidad. | `DESIGN.md` |

## Reglas de Lectura

- Consulta solo los archivos de contexto relevantes para la tarea actual.  
- Trata los archivos de contexto como guía, salvo que se indique explícitamente que están respaldados por una fuente de mayor autoridad.  
- Si el contexto entra en conflicto con código, pruebas, especificaciones de comandos o instrucciones explícitas del usuario, reporta el conflicto y prioriza la fuente de mayor autoridad.  
- No supongas ni inventes objetivos faltantes del proyecto, no-objetivos, tokens de diseño, contratos de API o reglas de datos.  
- No dupliques tokens de diseño de `DESIGN.md` dentro de `.mustflow/context/`.
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

# Indice De Contexto

Consulta este archivo para determinar que archivos de contexto del proyecto son relevantes para la tarea actual.
Evita leer todos los archivos de contexto por defecto para minimizar ruido.

## Contexto Disponible

| Contexto | Usar cuando | Ruta |
| --- | --- | --- |
| project | La tarea puede afectar la direccion del proyecto, el alcance, el comportamiento publico, los no-objetivos o convenciones de todo el repositorio. | `.mustflow/context/PROJECT.md` |

## Referencias Externas Opcionales

| Ancla | Usar cuando | Ruta |
| --- | --- | --- |
| human overview | Se requiere una vista publica del proyecto o una guia de instalacion. Tratalo como contexto general y no como politica obligatoria. | `README.md` |
| roadmap | Se requiere contexto sobre planificacion, prioridades, hitos o no-objetivos del proyecto. Tratalo como contexto de planificacion, no como politica mustflow instalada. | `ROADMAP.md` |
| visual design | La tarea implica cambios de interfaz, identidad visual, tokens de diseno, maquetacion o accesibilidad. | `DESIGN.md` |

## Reglas De Lectura

- Consulta solo los archivos de contexto relevantes para la tarea actual.
- Trata los archivos de contexto como guia, salvo que se indique de forma explicita que estan respaldados por una fuente de mayor autoridad.
- Si el contexto entra en conflicto con codigo, pruebas, especificaciones de comandos o instrucciones explicitas del usuario, reporta el conflicto y prioriza la fuente de mayor autoridad.
- No supongas ni inventes objetivos faltantes del proyecto, no-objetivos, tokens de diseno, contratos de API o reglas de datos.
- No dupliques tokens de diseno de `DESIGN.md` dentro de `.mustflow/context/`.

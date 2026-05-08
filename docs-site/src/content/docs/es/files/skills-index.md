---
title: .mustflow/skills/INDEX.md
description: Un indice que dirige a los agentes al documento de skill apropiado para una tarea.
---

`.mustflow/skills/INDEX.md` ayuda a los agentes a elegir el documento de skill correcto antes de iniciar tareas repetibles.

## Uso

Despues de consultar las reglas compartidas y el contrato de comandos, los agentes usan este indice cuando la tarea coincide con un procedimiento predefinido.

Este archivo no debe contener los detalles completos del procedimiento. Relaciona campos de ruta compactos con rutas de skill: disparador, entrada requerida, alcance de edicion, riesgo, intentos de verificacion y salida esperada.
`mf check --strict` compara estas rutas con los `SKILL.md` referenciados para mostrar documentos faltantes, skills no listadas, intentos desconocidos, deriva de intentos y deriva de forma de la tabla.

## Comportamiento de seleccion

Los agentes usan este indice al inicio de la tarea y antes de la primera edicion. Comparan la solicitud del usuario y los archivos previstos con los disparadores listados, y leen cada `SKILL.md` coincidente antes de editar ese alcance.

Si aparece una condicion nueva durante la tarea, como una falla de comando, cambio de contrato de pruebas o cambio documental, deben detenerse y leer la skill recien coincidente antes de continuar.

Si no aplica ningun disparador, no deben inventar una skill. Continuan con `AGENTS.md`, `.mustflow/docs/agent-workflow.md` y `.mustflow/config/commands.toml`.

## Funcion y responsabilidades

- Lista las skills disponibles y define disparadores precisos.
- Declara entrada requerida, alcance de edicion, riesgo y salida esperada para cada ruta.
- Especifica los intentos de comando referenciados por cada skill.
- Mantiene las rutas compactas para que los detalles de procedimiento sigan en cada `SKILL.md`.

## Pautas de autoria

El indice debe seguir siendo conciso y facil de revisar.

Los detalles de procedimiento deben vivir en cada `SKILL.md`. El indice solo debe incluir campos de ruta que ayuden al agente a decidir si leer una skill y que evidencia reportar.

## Estructura de tabla

- **Disparador**: condicion de tarea que justifica leer la skill.
- **Documento de skill**: ruta al `SKILL.md` correspondiente.
- **Entrada requerida**: evidencia o datos de solicitud necesarios.
- **Alcance de edicion**: archivos o superficie que la skill puede guiar.
- **Riesgo**: modo de falla principal que controla la ruta.
- **Intentos de verificacion**: nombres de intentos de `commands.toml` que pueden ser relevantes.
- **Salida esperada**: forma de reporte esperada despues de usar la skill.

Al introducir una nueva skill, agrega su ruta aqui y manten sincronizados los intentos de verificacion con el frontmatter de la skill.
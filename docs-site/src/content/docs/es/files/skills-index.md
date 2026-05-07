---
title: .mustflow/skills/INDEX.md
description: Índice que indica a los agentes qué documento de skill leer para una tarea.
---

`.mustflow/skills/INDEX.md` ayuda a los agentes a elegir el documento de skill correcto antes de iniciar trabajo repetible.

## Dónde se usa

Después de leer las reglas compartidas y el contrato de comando, los agentes usan este índice cuando la tarea actual coincide con un procedimiento repetible.

Este archivo no debe copiar cuerpos largos de skills. Conecta situaciones, rutas de skills e intenciones de comando relevantes.

## Función

- Enumera nombres de skills y cuándo usarlas.
- Enlaza tareas recurrentes como revisión de código, actualización de documentación, análisis de fallos y mantenimiento de pruebas.
- Enumera los nombres de intenciones de comando que cada skill puede necesitar.
- Permite eliminar o marcar como inactivas las skills específicas del repositorio que no se usan.

## Reglas de autoría

Mantén el índice breve y fácil de recorrer.

Coloca los procedimientos largos en cada `SKILL.md`. El índice debe contener solo el nombre, propósito, condición de activación e intenciones de comando relevantes de cada skill.

## Columnas de la tabla

- `Situation`: condición de tarea que debe activar la skill.
- `Document`: ruta al `SKILL.md` que contiene el procedimiento.
- `Command intents`: nombres de intención de `commands.toml` que la skill puede comprobar.

Cuando agregues una skill, enlázala aquí y mantén los nombres de intención de comando alineados con el frontmatter de la skill.

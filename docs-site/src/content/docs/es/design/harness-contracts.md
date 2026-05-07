---
title: Contratos de ejecución de agentes
description: Cómo mustflow admite sistemas de ejecución de agentes de larga duración sin convertirse en uno.
---

mustflow no aloja agentes autónomos de larga duración. Proporciona a los sistemas de ejecución de agentes un contrato local del repositorio que pueden leer y validar.

## Límite

- mustflow no crea procesos de trabajo, perfiles de agente, flotas ni entornos sandbox en la nube.
- mustflow no almacena registros de sesión sin procesar de forma indefinida.
- mustflow no reemplaza plataformas de agentes alojadas ni agentes de IDE.
- mustflow define reglas, contratos de comando, puntos de refresco, políticas de compactación, recibos, presupuestos, aprobaciones y límites de traspaso.

## Cerebro, manos y sesión

- Cerebro: `AGENTS.md`, `agent-workflow.md` y `skills/*/SKILL.md`.
- Manos: `commands.toml`, ciclos de vida de comandos finitos y `mf run`.
- Sesión: recibos de ejecución acotados, puntos de control opcionales, resúmenes vinculados a fuentes, traspasos compactos e índices regenerados.
- Evaluación: criterios de aceptación originales, archivos modificados, contratos de comando y recibos.

Este encuadre garantiza que mustflow siga siendo neutral respecto a herramientas. Un host puede ejecutar una sola sesión de chat, un agente en la nube en segundo plano o un bucle de orquestación externo, mientras el contrato del repositorio sigue siendo legible.

## Adoptado ahora

- Campos de política en `.mustflow/config/mustflow.toml`: `[harness]`, `[budget]`, `[approval]` e `[isolation]`.
- Reglas de ratchet de verificación en `agent-workflow.md`.
- Puntos de refresco, política de compactación por niveles y retención acotada.

Los resúmenes compactados sirven como memoria auxiliar de baja prioridad. Las instrucciones actuales del usuario, los archivos actuales, los contratos de comando y los recibos de ejecución prevalecen sobre ellos. mustflow no almacena cadenas ocultas de razonamiento ni transcripciones completas de chat dentro del proyecto.

## Diferido

`completion-judge`, elementos de trabajo, comandos de escritura de traspaso, comandos de checkpoint y bucles autónomos siguen siendo capacidades futuras opcionales. No deben aparecer en la plantilla predeterminada hasta que los contratos de los que dependen sean estables.

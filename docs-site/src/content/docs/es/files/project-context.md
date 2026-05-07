---
title: .mustflow/context/PROJECT.md
description: Registra objetivos, no objetivos, términos y compromisos de todo el repositorio para los agentes.
---

`.mustflow/context/PROJECT.md` es el archivo de contexto de proyecto predeterminado instalado por `mf init`.

Debe mantenerse breve. No es un documento completo de arquitectura, una hoja de ruta, una referencia de API, un registro de reuniones ni un archivo de resúmenes generados.

## Dónde se usa

- Da a los agentes orientación del proyecto cuando una tarea podría afectar el alcance, el comportamiento o compromisos de todo el repositorio.
- Registra no objetivos para que los agentes no amplíen trabajo no relacionado.
- Enumera términos del dominio y zonas de especial cuidado que cambian decisiones de implementación.

## Autoridad

La autoridad predeterminada es `contextual`.

Eso significa que el archivo ayuda a orientar al agente, pero tiene menor autoridad que las instrucciones directas del usuario, el código actual, las pruebas, los contratos de comando y las políticas configuradas.

Si entra en conflicto con los archivos actuales, los agentes deben informar el conflicto y tratar este contexto como desactualizado.

## Secciones

- `Objetivo actual`: objetivo actual del proyecto. Déjalo sin completar antes que inventar uno.
- `No objetivos`: cosas hacia las que los agentes no deben expandirse durante tareas no relacionadas.
- `Compromisos centrales`: compromisos de todo el repositorio que los agentes deben preservar.
- `Términos del dominio`: términos que afectan decisiones de implementación.
- `Zonas de especial cuidado`: rutas, API, archivos generados, migraciones, secretos o superficies de compatibilidad que requieren cautela.
- `Leer después`: archivos que se deben leer después de este contexto.
- `Comprobación de vigencia`: cómo detectar que el archivo está desactualizado.

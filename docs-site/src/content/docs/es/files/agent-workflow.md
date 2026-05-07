---
title: .mustflow/docs/agent-workflow.md
description: Describe cómo un agente inicia, edita, verifica y cierra el trabajo en el repositorio.
---

`.mustflow/docs/agent-workflow.md` describe el flujo de trabajo específico del repositorio para agentes.

## Dónde se usa

Si `AGENTS.md` es el archivo breve de reglas que se lee primero, este archivo amplía esas reglas como política compartida de trabajo.

Los agentes lo leen después de `AGENTS.md` para entender ejecución de comandos, estabilidad de entrada, compactación de contexto, alcance de edición, verificación, manejo de fallos y manejo de secretos.

## Componentes

- `Función del documento`: define qué responsabilidad tiene este archivo.
- `Documentos autoritativos y flujo de lectura`: enumera los archivos que los agentes leen primero.
- `Contexto del proyecto`: explica cuándo leer `.mustflow/context/INDEX.md` y archivos de contexto específicos de la tarea.
- `Comprobaciones previas`: indica a los agentes que inspeccionen cambios, rutas protegidas, intenciones de comando y skills relevantes.
- `Política de estabilidad de entrada`: mantiene los datos volátiles lejos de la parte superior de los archivos de lectura obligatoria.
- `Política de refresco de instrucciones`: define cuándo las sesiones largas deben releer instrucciones de mustflow.
- `Política de compactación de contexto`: explica límites y orden de autoridad para contexto reciente derivado, resúmenes intermedios y resúmenes largos.
- `Límite del contrato de ejecución de agentes`: separa los contratos del repositorio de los entornos de ejecución de agentes.
- `Fases de tareas largas`: define planificar, trabajar, verificar, evaluar y traspasar.
- `Trinquete de verificación`: impide que los agentes debiliten comprobaciones para aparentar que terminaron.
- `Política de relevancia de pruebas`: mantiene las pruebas alineadas con el contrato de comportamiento actual.
- `Política de interpretación de preferencias`: explica cómo aplicar idioma, formato, commits y valores predeterminados de registro desde `preferences.toml`.
- `Política de comportamiento de Git`: desactiva preparación, commits y push automáticos, y trata las sugerencias de mensajes de commit como contenido del informe.
- `Política de ejecución de comandos`: permite solo intenciones de comando finitas declaradas en `commands.toml`.
- `Política de edición`: limita los cambios a archivos directamente relacionados.
- `Política de verificación`: explica qué intenciones de comando comprobar después de cambios.
- `Política de manejo de fallos`: registra la intención fallida, directorio de trabajo, código de salida y error clave.
- `Política de seguridad y manejo de secretos`: evita exponer tokens, claves privadas y valores reales del entorno.
- `Mantenimiento del flujo de documentos`: indica a los mantenedores qué archivo mustflow actualizar cuando cambian reglas, comandos, skills o rutas protegidas.

## Política de ejecución de comandos

La fuente de verdad de los comandos ejecutables es `.mustflow/config/commands.toml`.

Los agentes solo pueden ejecutar intenciones de comando con `status = "configured"`, `lifecycle = "oneshot"`, `run_policy = "agent_allowed"` y `stdin = "closed"`. Si falta una intención, o está en `unknown`, `not_applicable`, `manual_only` o `disabled`, los agentes no deben inferir un comando de reemplazo y deben informar el motivo de omisión.

Las intenciones configuradas deben usar un arreglo `argv` cuando sea posible. Usa `mode = "shell"` y `cmd` solo cuando la sintaxis de shell sea realmente necesaria.

No ejecutes directamente comandos con ciclo de vida `server`, `watch`, `interactive`, `browser` o `background`. Los servidores de desarrollo, el modo observador, la interfaz de navegador y los procesos en segundo plano no son comandos finitos de validación.

Cuando `mf run <intent>` esté disponible, prefiérelo para comandos finitos.

`mf run` escribe el resultado de ejecución más reciente en `.mustflow/state/runs/latest.json` como recibo de ejecución.
Usa `mf run <intent> --json` cuando una automatización o los informes finales necesiten evidencia estructurada.
El recibo documenta una ejecución; la fuente de verdad de la definición del comando sigue siendo `commands.toml`.

`mf context --json` es un índice de solo lectura que muestra rápidamente el orden de lectura, intenciones de comando, capacidades y el último resumen de ejecución de la raíz actual. No reemplaza la lectura de los documentos y archivos de configuración reales, y los comandos de prueba o compilación del proyecto siguen obedeciendo el contrato de intención en `commands.toml`.

`mf doctor` o `mf doctor --json` es un comando de diagnóstico de solo lectura que combina estado de instalación, resultado de comprobación, intenciones ejecutables y siguientes pasos antes de editar. No escribe archivos, así que los agentes pueden usarlo para la primera orientación.

Después de cambiar documentos mustflow, skills, contratos de comando o reglas de generación del mapa del repositorio, ejecuta `mf check --strict` cuando sea posible. Esto agrega comprobaciones para bloques de comandos de shell sin procesar en documentos de skill, metadatos volátiles en `REPO_MAP.md`, límites de salida de comandos, política de retención, tamaños de archivos generados, trazas de registro JSONL sin procesar y el formato del último recibo de ejecución.

## Estabilidad de entrada

Mantén la política compartida en este documento y los comandos ejecutables en `commands.toml`.

Mueve los procedimientos repetibles a `.mustflow/skills/` y no copies toda la política compartida dentro de cada documento de skill.

Mantén la dirección del proyecto y los compromisos del dominio en `.mustflow/context/`. Los agentes deben leer `.mustflow/context/INDEX.md` solo cuando se necesite contexto específico de la tarea, y luego leer solo los archivos de contexto seleccionados.

Los archivos de contexto tienen menor autoridad que las instrucciones directas del usuario, el código actual, las pruebas, los contratos de comando y las políticas configuradas. Si existe `DESIGN.md`, úsalo como ancla externa opcional de diseño visual para trabajo de interfaz, en lugar de duplicar variables de diseño en `.mustflow/context/`.

Mantén el mapa de navegación del repositorio en el `REPO_MAP.md` generado en lugar de hacer crecer este documento. `REPO_MAP.md` es un mapa de archivos ancla, no una lista completa de archivos; no forma parte del orden de lectura obligatorio y debe leerse solo cuando se necesita navegación amplia.

No coloques valores volátiles, como horas generadas, hashes, recuentos de archivos, resúmenes de cambios recientes o registros largos, cerca de la parte superior de este archivo.

No sigas agregando transcripciones completas de chat, salida completa de terminal ni registros de eventos JSONL sin procesar bajo `.mustflow/`. Conserva los resultados de ejecución como recibos pequeños y los archivos de conocimiento como resúmenes con fuentes, no como registros sin procesar.

## Refresco de instrucciones

Las sesiones largas pueden diluir las instrucciones cargadas al inicio de la tarea. `agent-workflow.md` trata esto como un problema de puntos de control, no como una razón para escribir contadores de turnos en el repositorio.

Los agentes deben refrescar las instrucciones de mustflow antes de la primera edición, antes de ejecutar comandos cuando la intención de comando actual no tenga ya un refresco reciente, después de compactar contexto, después de editar `AGENTS.md` o `.mustflow/**`, después de cambiar de raíz y antes del informe final.

El conjunto exacto de archivos viene de `[refresh.levels]` en `.mustflow/config/mustflow.toml`.

## Política de compactación de contexto

Los resúmenes compactados creados durante sesiones largas son memoria auxiliar derivada. `agent-workflow.md` indica que tienen menor autoridad que las instrucciones actuales del usuario, el código y la configuración actuales, los contratos de comando y los recibos de ejecución.

No almacenes cadenas ocultas de razonamiento, secretos ni transcripciones completas e ilimitadas de chat en el proyecto. El conocimiento compartido del proyecto solo debe promoverse como decisiones, investigaciones o resúmenes de traspaso vinculados a fuentes.

## Límite del contrato de ejecución de agentes

mustflow no es un entorno autónomo de ejecución de agentes. Proporciona contratos locales del repositorio que los sistemas de ejecución de agentes pueden leer.

- Contrato de cerebro: `AGENTS.md`, `agent-workflow.md` y documentos de skill.
- Contrato de manos: `commands.toml`, `mf run` y ciclos de vida de comandos finitos.
- Contrato de sesión: recibos de ejecución acotados, resúmenes vinculados a fuentes y registros compactos de traspaso.
- Contrato de evaluación: objetivos originales, criterios de aceptación, archivos modificados, contratos de comando y recibos.

## Fases de tareas largas

El trabajo de larga duración debe separar planificación, trabajo, verificación, evaluación y traspaso. La fase de evaluación no debe aceptar por sí sola la afirmación de finalización de un proceso de trabajo. Comprueba los criterios originales, los archivos modificados y los recibos de ejecución.

## Trinquete de verificación

El flujo de trabajo prohíbe debilitar la validación para hacer que una tarea parezca terminada. Los agentes no deben eliminar pruebas fallidas, relajar aserciones sin explicación, omitir intenciones de comando relevantes, cambiar el estado de una intención solo para evitar un fallo ni reescribir criterios de aceptación después de implementar.

Las pruebas pueden cambiar cuando cambia el comportamiento previsto o cuando las pruebas existentes son incorrectas, pero el informe final debe explicar por qué.

## Política de relevancia de pruebas

Las pruebas validan el contrato de comportamiento actual. Los agentes no deben reintroducir comportamiento eliminado solo porque pruebas antiguas lo esperan, ni preservar pruebas de funciones eliminadas intencionadamente.

Cuando se eliminan pruebas o se debilitan aserciones, distingue la limpieza del contrato actual de la evasión de validación. Si la relevancia es incierta, informa el candidato obsoleto en lugar de eliminarlo.

## Política de interpretación de preferencias

`.mustflow/config/preferences.toml` contiene valores predeterminados de nivel de repositorio por debajo de las instrucciones directas del usuario y del estilo local existente.

Los agentes no deben usar este archivo como razón para reformatear archivos completos, cambiar archivos no relacionados o traducir cadenas de registro existentes sin un motivo de tarea.

`preserve_existing` significa que el agente sigue una convención existente visible. En un repositorio nuevo donde no se ve ninguna convención, el agente usa el valor `fallback` de cada campo.

El idioma del chat del usuario no debe determinar automáticamente el idioma de comentarios de código, registros, mensajes de error ni mensajes de commit.

## Política de comportamiento de Git

`git.auto_stage`, `git.auto_commit` y `git.auto_push` son `false` de forma predeterminada.

Sin una solicitud explícita del usuario, los agentes no deben preparar cambios, crear commits, enmendar, reorganizar historial, restablecer, hacer push ni cambiar de otro modo el estado o historial de Git.

La sugerencia de mensaje de commit forma parte del informe final, no del permiso para ejecutar Git. Cuando cambian archivos y las sugerencias de commit están habilitadas, los agentes pueden sugerir un mensaje de commit, pero no deben insinuar que se creó un commit.

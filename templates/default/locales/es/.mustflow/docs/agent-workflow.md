---
mustflow_doc: docs.agent-workflow
locale: es
canonical: false
revision: 6
---

# Flujo De Trabajo Del Agente

Este documento amplia el enrutador breve de `AGENTS.md`.
Define el bucle operativo predeterminado para agentes que trabajan dentro de una raiz de mustflow.

## Orientacion

Consulta los archivos listados en `AGENTS.md` antes de iniciar ediciones. Usa `mf doctor` para una comprobacion rapida y de solo lectura del estado de instalacion, los command intents configurados y los siguientes pasos sugeridos.

Usa `REPO_MAP.md` exclusivamente como mapa de navegacion generado para la raiz actual de mustflow. No es un listado completo de archivos y no reemplaza la necesidad de leer los archivos relevantes para la tarea.

## Contexto Del Proyecto

`.mustflow/context/` contiene contexto de proyecto especifico de la tarea para agentes.
No es un archivo general de documentacion.

- Lee `.mustflow/context/INDEX.md` solo cuando la tarea requiera contexto de proyecto, producto, dominio, interfaz, backend, datos, seguridad u operaciones.
- Lee unicamente los archivos de contexto seleccionados por el indice.
- Trata los archivos de contexto como secundarios frente a instrucciones directas del usuario, codigo actual, pruebas, contratos de comandos y politicas configuradas.
- No infieras objetivos faltantes del proyecto, no-objetivos, promesas de API, reglas de datos ni tokens de diseno.
- Si existe `DESIGN.md`, tratalo como un ancla visual externa opcional para trabajo de interfaz. No dupliques sus tokens de diseno en `.mustflow/context/`.
- Si el contexto entra en conflicto con archivos o comandos actuales, reporta el conflicto y prioriza la fuente de mayor autoridad.

## Estabilidad De Entradas

Trata las instrucciones del usuario, los archivos locales, los contratos de comandos y los reportes generados como fuentes distintas.
Evita mezclar estas fuentes.

- Las instrucciones directas del usuario tienen prioridad.
- El `AGENTS.md` mas cercano tiene prioridad sobre reglas padre mas amplias.
- `.mustflow/config/preferences.toml` contiene valores predeterminados, no requisitos obligatorios.
- Archivos generados como `REPO_MAP.md`, `.mustflow/cache/**` y `.mustflow/state/**` pueden quedar desactualizados.
- Los resumenes compactados son representaciones derivadas del estado. El codigo actual, la configuracion, los registros de comandos y las instrucciones actuales del usuario prevalecen sobre ellos.

Cuando un archivo generado parezca desactualizado, actualizalo mediante el comando `mf` correspondiente en lugar de editarlo manualmente.

## Actualizacion De Instrucciones

Las sesiones largas pueden causar desviacion de instrucciones. Trata la actualizacion de instrucciones como un punto de control obligatorio, no como un contador en archivos del proyecto.

Actualiza las instrucciones de mustflow en estos puntos:

- inicio de sesion
- inicio de nueva tarea
- antes de la primera edicion
- antes de ejecutar comandos
- despues de editar `AGENTS.md` o `.mustflow/**`
- despues de cambiar de raiz o entrar en un repositorio anidado
- despues de compactacion o resumen de contexto
- antes del informe final
- despues del umbral configurado de turnos, llamadas de herramientas o tamano de salida

Usa `[refresh]` en `.mustflow/config/mustflow.toml` para decidir el nivel de actualizacion:

- `light`: releer `AGENTS.md` y `.mustflow/docs/agent-workflow.md`
- `command`: releer `AGENTS.md` y `.mustflow/config/commands.toml`
- `skill`: releer `AGENTS.md` y `.mustflow/skills/INDEX.md`
- `full`: releer la secuencia completa de lectura de mustflow

No escribas contadores de turnos, conteos de mensajes ni actividad de sesion en el repositorio. Si un host de agentes rastrea estado de actualizacion, debe usar cache local o estado gestionado por el host fuera de documentos versionados del proyecto. Las skills pueden describir comportamiento de actualizacion, pero no son hooks de ciclo de vida confiables.

## Compactacion De Contexto

mustflow admite una politica de compactacion de contexto por niveles, pero no recopila transcripciones completas del chat por defecto.

Usa `[compaction]` en `.mustflow/config/mustflow.toml` para declarar como un agente host puede separar:

- contexto bruto reciente conservado en cache local
- resumenes intermedios con referencias de origen
- resumenes de largo plazo que preserven decisiones, restricciones, riesgos y siguientes pasos
- limites de retencion de datos brutos para cualquier archivo de sesion gestionado por el host

No almacenes razonamiento oculto, secretos ni transcripciones brutas sin limite en el proyecto. Un resumen compactado debe estar vinculado a su fuente y debe mantener menor autoridad que los archivos actuales y las instrucciones actuales del usuario.

## Limite Del Contrato De Harness

mustflow no es un entorno de ejecucion autonomo de agentes. Es una capa de contrato local al repositorio para harnesses de agentes.

- Contrato de cerebro: `AGENTS.md`, este archivo de flujo de trabajo y los documentos de skills definen el comportamiento esperado del modelo.
- Contrato de manos: `.mustflow/config/commands.toml` y `mf run` definen ejecucion segura de comandos.
- Contrato de sesion: registros de ejecucion, puntos de control acotados y handoffs compactos aportan evidencia para recuperacion.

No crees carpetas de workers, sistemas de personas, orquestacion de flotas, registros crudos de eventos ni bucles autonomos a menos que el repositorio agregue de forma explicita esas superficies opcionales.

## Fases De Tareas De Larga Duracion

Para tareas de larga duracion o reanudadas, separa estas fases:

1. Plan: leer el objetivo de la tarea, reglas del repositorio, contrato de comandos y criterios de aceptacion.
2. Trabajo: realizar el cambio seguro mas pequeno para la unidad actual.
3. Verificacion: ejecutar solo command intents oneshot configurados, preferiblemente con `mf run`.
4. Evaluacion: evaluar el resultado frente a los criterios de aceptacion originales y los recibos de ejecucion.
5. Handoff: dejar un handoff compacto cuando la tarea este incompleta, bloqueada o necesite continuacion.

La fase de evaluacion no debe considerar suficiente la afirmacion de finalizacion del worker. Debe usar el objetivo de la tarea, los archivos cambiados, el contrato de comandos y los recibos de ejecucion.

## Politica De Ejecucion De Comandos

No infieras comandos a partir de `package.json`, `Makefile`, `justfile`, `Taskfile.yml` ni archivos fuente.
Usa `.mustflow/config/commands.toml` como contrato de comandos.

Un command intent es apto para uso del agente solo cuando se cumplen todas estas condiciones:

- `status = "configured"`
- `lifecycle = "oneshot"`
- `run_policy = "agent_allowed"`
- `stdin = "closed"`
- Hay un timeout definido

Prefiere `mf run <intent>` para que el proyecto reciba un registro de ejecucion conciso en `.mustflow/state/runs/latest.json`.

No ejecutes directamente servidores de desarrollo, watchers, aperturas de navegador, prompts interactivos ni procesos en segundo plano. En su lugar, reporta el intent omitido y el motivo.

## Politica De Edicion

Manten los cambios dentro del alcance de la tarea. No hagas refactorizaciones colaterales.
No modifiques rutas protegidas de `.mustflow/config/mustflow.toml`.

Usa el estilo existente del proyecto. Si el estilo no es claro, aplica los valores predeterminados en `.mustflow/config/preferences.toml`.

Los archivos generados deben refrescarse con herramientas:

- `REPO_MAP.md` mediante `mf map --write`
- `.mustflow/cache/mustflow.sqlite` mediante `mf index`
- `.mustflow/state/runs/latest.json` mediante `mf run <intent>`

## Verificacion

Usa command intents configurados para comprobaciones. Nombres tipicos de intent:

- `mustflow_check`
- `test`
- `lint`
- `build`
- `docs_validate`

Si falta un intent esperado, esta deshabilitado, es solo manual o no esta configurado, no inventes un reemplazo.
Reporta que se omitio y por que.

## Control Estricto De Verificacion

No debilites la validacion para aparentar que la tarea esta completa.

Los agentes no deben:

- eliminar pruebas fallidas para hacer pasar comprobaciones
- aflojar aserciones sin explicar por que
- omitir command intents relevantes
- marcar command intents como `not_applicable` solo para evitar un fallo
- cambiar criterios de aceptacion despues de implementar

Los agentes pueden actualizar pruebas cuando cambie el comportamiento esperado, la prueba anterior sea incorrecta o el nuevo comportamiento requiera cobertura nueva. Explica ese cambio en el informe final.

## Politica De Relevancia De Pruebas

Las pruebas son contratos de comportamiento, no artefactos permanentes.

Los agentes no deben:

- reintroducir comportamiento eliminado solo porque pruebas antiguas lo esperan
- conservar pruebas de funcionalidades eliminadas de forma intencional
- eliminar pruebas fallidas solo para hacer pasar la validacion
- aflojar aserciones sin explicar el cambio de comportamiento
- actualizar snapshots solo para hacer pasar pruebas

Los agentes pueden actualizar o eliminar pruebas cuando el comportamiento probado se haya eliminado intencionalmente, haya cambiado el contrato publico, la prueba solo codifique detalles de implementacion eliminados, la cobertura este duplicada por una prueba mas fuerte o un snapshot este obsoleto.

Cuando se agreguen, actualicen, eliminen o identifiquen pruebas candidatas a obsolescencia, reporta el contrato de comportamiento, las pruebas afectadas, comandos ejecutados, command intents omitidos y riesgos remanentes de pruebas.

## Presupuesto, Aprobacion Y Aislamiento

Usa `.mustflow/config/mustflow.toml` para la politica de seguridad de ejecuciones largas.

- `[budget]` limita iteraciones, tiempo de reloj, ejecuciones de comandos, volumen de salida y fallos repetidos.
- `[approval]` enumera acciones que requieren aprobacion humana antes de continuar.
- `[isolation]` describe el limite preferido de worktree o sandbox para tareas de larga duracion.

Cuando se alcance un limite de presupuesto o una puerta de aprobacion, detente y reporta o realiza handoff. No sigas en bucle.
No ejecutes trabajo autonomo de larga duracion en un worktree principal con cambios sucios cuando la politica de aislamiento requiera un worktree o sandbox separado.

## Manejo De Fallos

Cuando falle un comando:

1. Conserva el nombre original del command intent.
2. Analiza el codigo de salida y la cola truncada de salida.
3. Identifica la causa raiz mas probable del fallo.
4. Evita modificar archivos no relacionados.
5. Vuelve a ejecutar la verificacion relevante mas dirigida despues de aplicar una correccion.
6. Reporta comprobaciones omitidas y riesgos remanentes.

No almacenes registros completos en bruto, secretos, datos de clientes ni transcripciones largas en `.mustflow/`.

## Informe

Los informes finales deben incluir:

- Archivos cambiados
- Command intents ejecutados
- Command intents omitidos con razones
- Resultado de verificacion
- Riesgo remanente

Sugiere commits solo cuando `.mustflow/config/preferences.toml` lo permita.

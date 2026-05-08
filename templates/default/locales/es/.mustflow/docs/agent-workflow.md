---
mustflow_doc: docs.agent-workflow
locale: es
canonical: false
revision: 9
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

## Activacion De Skills

Las skills son procedimientos de tarea, no herramientas autonomas. Activar una skill significa leer
el `.mustflow/skills/<name>/SKILL.md` correspondiente y seguir su procedimiento dentro del contrato
de comandos actual.

Al iniciar una tarea y antes de la primera edicion:

1. Lee `.mustflow/skills/INDEX.md`.
2. Compara la tarea actual con los escenarios listados.
3. Lee cada `SKILL.md` correspondiente antes de editar esa parte del trabajo.
4. Si no aplica ninguna skill, realiza el cambio seguro mas pequeno bajo `AGENTS.md` y
   `.mustflow/config/commands.toml`.

Activa una skill mas tarde si nueva evidencia cambia el tipo de tarea. Por ejemplo, un comando
configurado que falla activa failure triage, un cambio de contrato de pruebas activa test maintenance,
y un cambio de documentacion o workflow activa docs update.

Cuando varias skills aplican, sigue la skill mas especifica para cada alcance afectado y combina
solo sus command intents declarados. Las skills nunca autorizan comandos de shell crudos,
procesos de larga duracion ni escrituras fuera del alcance de la tarea.

## Estabilidad De Entradas

Trata las instrucciones del usuario, los archivos locales, los contratos de comandos y los reportes generados como fuentes distintas.
Evita mezclar estas fuentes.

- Las instrucciones directas del usuario tienen prioridad.
- El `AGENTS.md` mas cercano tiene prioridad sobre reglas padre mas amplias.
- `.mustflow/config/preferences.toml` contiene valores predeterminados, no requisitos obligatorios.
- Archivos generados como `REPO_MAP.md`, `.mustflow/cache/**` y `.mustflow/state/**` pueden quedar desactualizados.
- Los resumenes compactados son representaciones derivadas del estado. El codigo actual, la configuracion, los registros de comandos y las instrucciones actuales del usuario prevalecen sobre ellos.

Cuando un archivo generado parezca desactualizado, actualizalo mediante el comando `mf` correspondiente en lugar de editarlo manualmente.

## Carriles De Reglas Efectivas

No reduzcas todas las instrucciones a una sola lista de prioridades. Resuelve conflictos segun el tipo de regla:

- Objetivo del usuario: las instrucciones directas actuales del usuario definen la tarea salvo que sean inseguras.
- Seguridad del host: las puertas de aprobacion, sandbox y ejecucion del host siguen vigentes cuando son mas estrictas.
- Reglas de trabajo del repositorio: usa el `AGENTS.md` mas cercano y `.mustflow/config/*.toml`.
- Ejecucion de comandos: `.mustflow/config/commands.toml` es el contrato de comandos del proyecto.
- Evidencia de verificacion: los recibos de `mf run` y los archivos actuales tienen mas peso que la salida directa del shell del host.
- Contexto y preferencias: `.mustflow/context/*`, `preferences.toml` y los mapas generados son valores predeterminados de menor autoridad.
- Estado de sesion y cache: los resumenes del host, `.mustflow/cache/**` y `.mustflow/state/**` nunca sustituyen los archivos actuales ni las instrucciones actuales del usuario.

Los conjuntos permitidos se reducen por interseccion. Las acciones denegadas, requisitos de aprobacion,
reglas de privacidad y reglas de comandos destructivos se acumulan. Si la regla efectiva no esta clara,
detente y reporta el conflicto en lugar de adivinar.

## Actualizacion De Instrucciones

Las sesiones largas pueden causar desviacion de instrucciones. Trata la actualizacion de instrucciones como un punto de control obligatorio, no como un contador en archivos del proyecto.

Actualiza las instrucciones de mustflow en estos puntos:

- inicio de sesion
- inicio de nueva tarea
- antes de la primera edicion
- antes de ejecutar comandos cuando la tarea y la intencion de comando actuales no tengan ya un refresco de comando reciente
- despues de editar `AGENTS.md` o `.mustflow/**`
- despues de cambiar de raiz o entrar en un repositorio anidado
- despues de compactacion o resumen de contexto
- antes del informe final
- despues del umbral configurado de turnos, llamadas de herramientas o tamano de salida

Usa `[refresh]` en `.mustflow/config/mustflow.toml` para decidir el nivel de actualizacion:

- `light`: releer `AGENTS.md` y `.mustflow/docs/agent-workflow.md`
- `command`: releer `AGENTS.md` y `.mustflow/config/commands.toml`
- `edit`: releer `AGENTS.md`, `.mustflow/config/mustflow.toml` y `.mustflow/docs/agent-workflow.md` antes de ediciones sensibles
- `report`: releer `AGENTS.md`, `.mustflow/config/mustflow.toml` y `.mustflow/config/preferences.toml` antes del informe final
- `skill`: releer `AGENTS.md` y `.mustflow/skills/INDEX.md`
- `full`: releer la secuencia completa de lectura de mustflow

`before_command_run` es un punto de control de frescura para la intencion de comando actual, no una obligacion de releer todos los archivos antes de cada comando repetido cuando el contrato de comandos no ha cambiado.

No escribas contadores de turnos, conteos de mensajes ni actividad de sesion en el repositorio. Si un host de agentes rastrea estado de actualizacion, debe usar cache local o estado gestionado por el host fuera de documentos versionados del proyecto. Las skills pueden describir comportamiento de actualizacion, pero no son hooks de ciclo de vida confiables.

## Compactacion De Contexto

`compaction` no es una funcion predeterminada de recoleccion de datos. Es una politica de seguridad para futuros harnesses o hosts. La plantilla predeterminada la mantiene desactivada y solo declara reglas de seguridad.

No almacenes razonamiento oculto, secretos, transcripciones completas, salida completa de terminal, eventos brutos ni registros brutos de comandos dentro del proyecto. Si un host crea resumenes en el futuro, deben estar vinculados a fuentes y mantener menor autoridad que los archivos actuales y las instrucciones actuales del usuario.

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

## Politica De Comportamiento De Git

Las operaciones de Git que modifican estado o historial estan denegadas por defecto.

- `git.auto_stage = false`: no hacer stage sin una solicitud del usuario.
- `git.auto_commit = false`: no crear commits sin una solicitud del usuario.
- `git.auto_push = false`: no hacer push sin una solicitud del usuario.

Estos valores son preferencias del repositorio, no permisos. No anulan instrucciones directas del usuario, `.mustflow/config/commands.toml` ni la politica de aprobacion en `.mustflow/config/mustflow.toml`. En particular, `git.auto_commit = true` no concede permiso para push, y `git.auto_push = true` no puede habilitarse mediante `mf init`.

## Politica De Impacto De Version

La configuracion de impacto de version es una preferencia, no un permiso de release.

Usa `[release.versioning]` en `.mustflow/config/preferences.toml` cuando cambien codigo,
plantillas, esquemas, comportamiento de CLI, metadatos de paquete, documentacion visible
para usuarios, salida de instalacion o pruebas.

- `impact_check = true`: informa si el diff parece requerir un cambio de version de paquete o plantilla.
- `suggest_bump = true`: sugiere patch, minor o major cuando la evidencia sea clara.
- `auto_bump = false`: no edites archivos de version de paquete o plantilla sin solicitud explicita del usuario.
- `require_user_confirmation = true`: exige una solicitud aprobada por el usuario para cambiar versiones o preparar release.

Antes de sugerir o aplicar un cambio de version, localiza la fuente de version propia del repositorio.
No supongas que `package.json` es el unico archivo de version. Revisa los manifests, documentos de
release y patrones existentes que correspondan a los lenguajes y frameworks del repositorio, y reporta
que archivos son fuente autoritativa y cuales son derivados.

Candidatos comunes de fuente de version:

- JavaScript o TypeScript: `package.json` y lockfiles cuando duplican metadatos del paquete.
- Python: `pyproject.toml`, `setup.cfg`, `setup.py` o archivos `__version__` del paquete.
- Rust: `Cargo.toml`; considera `Cargo.lock` solo si el repositorio trata el lockfile como metadato de release.
- Go: primero tags y documentacion de release; `go.mod` solo si la ruta del modulo o metadatos de herramientas son relevantes.
- Java o Kotlin: `pom.xml`, `build.gradle`, `build.gradle.kts` o `gradle.properties`.
- .NET: `*.csproj`, `Directory.Build.props` o `*.nuspec`.
- Ruby, PHP, Dart o Swift: `*.gemspec`, `lib/**/version.rb`, `composer.json`, `pubspec.yaml` o `Package.swift`.
- Contenedores, charts o apps: `Chart.yaml`, labels de imagen, manifests de app, notas de release o metadatos de despliegue.
- Plantillas mustflow: metadatos de paquete, manifests de plantilla, ejemplos de documentacion y pruebas que validan versiones instaladas.

Cuando un cambio de version se aprueba, manten sincronizados metadatos de paquete, versiones de manifests
de plantilla, ejemplos de documentacion y pruebas segun las preferencias `sync_*`.

## Politica De Ejecucion De Comandos

No infieras comandos a partir de `package.json`, `Makefile`, `justfile`, `Taskfile.yml` ni archivos fuente.
Usa `.mustflow/config/commands.toml` como contrato de comandos.

Un command intent es apto para uso del agente solo cuando se cumplen todas estas condiciones:

- `status = "configured"`
- `lifecycle = "oneshot"`
- `run_policy = "agent_allowed"`
- `stdin = "closed"`
- `timeout_seconds` es un entero positivo
- El comando esta declarado con `argv`, o con `mode = "shell"` y `cmd`
- `cwd` permanece dentro de la raiz mustflow actual

`manual_only` es un estado para configuraciones nuevas. `run_policy = "manual_only"` puede leerse por compatibilidad con configuraciones antiguas, pero las plantillas nuevas deben usar `status = "manual_only"`.

Prefiere `mf run <intent>` para que el proyecto reciba un registro de ejecucion conciso en `.mustflow/state/runs/latest.json`.

Los shells del host pueden ejecutar comandos, pero los comandos directos del proyecto no cuentan
automaticamente como verificacion mustflow. Si un comando evita `mf run`, trata su salida como contexto
de menor confianza salvo que el usuario haya aprobado explicitamente una excepcion manual y el informe
final indique que no se produjo recibo de ejecucion mustflow.

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

## Seleccion De Verificacion

Usa `[verification.selection]` en `.mustflow/config/preferences.toml` para elegir el alcance de verificacion.
Estas preferencias no conceden permiso para ejecutar comandos. Solo orientan que command intents configurados considerar.

- `strategy = "risk_based"`: prefiere las comprobaciones configuradas mas pequenas que cubran el comportamiento cambiado, la superficie publica, el contrato de comandos y el area de riesgo.
- `strategy = "targeted"`: prefiere comprobaciones directamente relacionadas salvo que el usuario, una skill o una politica exija cobertura mas amplia.
- `strategy = "full"`: prefiere toda la suite de verificacion configurada que aplique.
- `prefer_related_tests = true`: busca un intent de prueba mas estrecho y relevante antes de uno amplio.
- `skip_docs_only_full_test = true`: los cambios solo de documentacion pueden omitir pruebas amplias cuando la validacion de docs cubre la superficie editada.
- `skip_translation_only_full_test = true`: los cambios solo de traduccion pueden omitir pruebas amplias cuando el comportamiento fuente no cambio.
- `skip_copy_only_full_test = true`: los cambios solo de texto pueden omitir pruebas amplias cuando no cambiaron comportamiento, schema, plantilla ni contrato de comandos.
- `report_skipped = true`: el informe final debe nombrar las comprobaciones omitidas y la razon.

Si hay evidencia de cambios en comportamiento, seguridad, datos, contratos de comandos, salida de release o plantillas generadas,
no uses una preferencia de omision para ocultar riesgo. Eleva a un intent configurado relevante o reporta que falta el intent necesario.

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

Cuando se alcance un limite de presupuesto o una puerta de aprobacion, detente y reporta. Usa handoff solo cuando este repositorio habilite explicitamente un flujo de handoff. No sigas en bucle.
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

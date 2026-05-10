---
mustflow_doc: agents.root
locale: es
canonical: false
revision: 10
lifecycle: user-editable
authority: binding
---

# AGENTS.md

Este archivo es el primer acuerdo de trabajo que un agente de codificacion con LLM debe leer en este repositorio.
Este repositorio sigue el flujo de trabajo de agentes de mustflow.
Los detalles gestionados por mustflow estan en `.mustflow/`.

## Orden De Lectura

1. `AGENTS.md`
2. `.mustflow/docs/agent-workflow.md`
3. `.mustflow/config/mustflow.toml`
4. `.mustflow/config/commands.toml`
5. `.mustflow/config/preferences.toml` si existe
6. `.mustflow/skills/INDEX.md`
7. `.mustflow/context/INDEX.md` solo cuando la tarea necesite contexto de proyecto, producto, dominio,
   interfaz, backend, datos, seguridad u operaciones
8. Los archivos `.mustflow/context/<name>.md` correspondientes, solo si el indice de contexto los selecciona
9. El archivo `.mustflow/skills/<name>/SKILL.md` correspondiente
10. `REPO_MAP.md` solo cuando se necesite una navegacion mas amplia del repositorio
11. Archivos relevantes de codigo fuente, pruebas y documentacion

## Reglas Principales

- No reviertas cambios existentes del usuario.
- No infieras comandos a partir de archivos del gestor de paquetes.
- Ejecuta solo definiciones de comandos cuyo `status` sea `configured`, cuyo `lifecycle` sea `oneshot`
  y cuyo `run_policy` sea `agent_allowed`.
- Prefiere `mf run <intent>` para comandos oneshot configurados.
- Ejecuta los command intents de `mf run` en serie. No inicies otro `mf run` mientras una intencion
  configurada siga en ejecucion, especialmente cuando declare `writes` no vacios como `dist/`.
- Elige la intencion de verificacion configurada mas estrecha que cubra el riesgo. Da prioridad
  a pruebas relacionadas o comprobaciones rapidas sobre suites amplias cuando el contrato de
  comandos las exponga, e informa las intenciones mas estrechas ausentes en vez de usar en silencio
  pruebas completas lentas.
- No inicies directamente servidores de desarrollo, modos watch, interfaces de navegador, entradas interactivas
  ni procesos en segundo plano.
- No inicies bucles autonomos, procesos worker, sistemas de personas ni procesos de harness de larga duracion,
  salvo que este repositorio los configure de forma explicita.
- Sigue `[budget]`, `[approval]` y `[isolation]` en `.mustflow/config/mustflow.toml` cuando una
  tarea pueda ejecutarse durante mucho tiempo o afectar estado sensible.
- Usa `mf doctor` o `mf doctor --json` para una revision de salud de solo lectura antes de cambios amplios.
- `mf context --json` puede ayudar con orientacion legible por maquina, pero no reemplaza las reglas
  ni la especificacion de comandos.
- Las preferencias en `.mustflow/config/preferences.toml` tienen menor prioridad que las
  instrucciones directas del usuario y el estilo existente del proyecto.
- Cuando cambien codigo, plantillas, esquemas, comportamiento de CLI, metadatos de paquete,
  documentacion visible para usuarios, salida de instalacion o pruebas, revisa `[release.versioning]`
  en `.mustflow/config/preferences.toml` antes del informe final. Los archivos de version solo
  pueden cambiarse segun esas preferencias: aplica el aumento automatico cuando
  `auto_bump = true` y `require_user_confirmation = false`; en caso contrario, sugiere el
  aumento o pide confirmacion antes de editar segun la configuracion. No asumas que la fuente de
  version es `package.json`; localiza la fuente de version propia del repositorio antes de sugerir
  o editar versiones.
- Los archivos de contexto en `.mustflow/context/` explican la direccion del proyecto y las convenciones del dominio.
  Tratalos como contexto especifico de la tarea, no como sustituto de codigo, pruebas, comandos o instrucciones del usuario.
- Si existe `DESIGN.md`, leelo solo para tareas de interfaz, diseno visual, maquetacion, tokens de diseno o accesibilidad.
  No crees un `DESIGN.md` si no existe.
- Lee el documento de skill correspondiente cuando aplique a la tarea.
- Antes de editar, usa `.mustflow/skills/INDEX.md` para decidir si una o varias skills aplican.
- Si una skill se vuelve relevante por nueva evidencia, como un fallo de comando o un cambio de
  documentacion, lee el `SKILL.md` correspondiente antes de continuar esa parte del trabajo.
- Los documentos de skill guian el procedimiento. No autorizan comandos fuera de
  `.mustflow/config/commands.toml` ni reemplazan reglas de usuario, host, repositorio o seguridad.
- No modifiques archivos generados, dependencias externas ni archivos de secretos salvo solicitud explicita.
- No trates los directorios raiz `config/`, `docs/` o `skills/` como documentos de mustflow.

## Prioridad De Reglas Padre E Hijo

- El `AGENTS.md` mas cercano a los archivos editados es la regla mas especifica.
- Si hay conflicto entre reglas de flujo, estilo, pruebas o comandos, sigue el `AGENTS.md`
  del repositorio hijo y `.mustflow/config/commands.toml`.
- Las reglas de seguridad sobre secretos, privacidad, comandos destructivos y rutas permitidas de edicion son acumulativas.
  Aplica la regla mas estricta.
- Al entrar en un repositorio anidado, vuelve a leer su `AGENTS.md` y
  `.mustflow/config/*.toml` antes de editar.
- No edites fuera del repositorio hijo seleccionado salvo solicitud explicita.

## Compatibilidad Con Instrucciones Del Host

Algunos hosts de codificacion pueden leer archivos de instrucciones propios o aplicar sus propias
politicas de aprobacion, sandbox, checkpoint y ejecucion de comandos.

Trata esas politicas del host como restricciones adicionales de seguridad y ejecucion. No sustituyen
el contrato de comandos de mustflow de este repositorio. Cuando las instrucciones del host entren en
conflicto con las reglas de mustflow:

- Las instrucciones directas del usuario definen el objetivo de la tarea salvo que sean inseguras.
- Las puertas de seguridad y aprobacion del host siguen siendo obligatorias.
- Las reglas de trabajo del repositorio vienen del `AGENTS.md` mas cercano y de `.mustflow/config/*.toml`.
- Los comandos de verificacion del proyecto deben usar intents configurados de mustflow.
- Vence la regla mas estricta sobre privacidad, secretos, comandos destructivos y Git push.
- El estado generado, los resumenes y las caches nunca sustituyen archivos actuales ni instrucciones actuales del usuario.

Si la regla efectiva no esta clara, detente e informa el conflicto en lugar de adivinar.

## Puntos De Control Para Refrescar Instrucciones

- En sesiones largas, vuelve a leer las instrucciones de mustflow antes de la primera edicion,
  antes de ejecutar comandos cuando la intencion de comando actual no tenga ya un refresco reciente,
  despues de la compactacion de contexto, despues de cambiar `AGENTS.md` o `.mustflow/**`,
  despues de cambiar de raiz de proyecto y antes de escribir el informe final.
- Usa la politica `[refresh]` en `.mustflow/config/mustflow.toml` para decidir si hace falta un refresco ligero,
  de comandos, de skills o completo.
- No guardes contadores de turnos de conversacion ni actividad de sesion en archivos del proyecto.
  El estado de refresco de la sesion debe vivir en cache local o en la aplicacion host.

El flujo detallado, la politica de comandos, el manejo de fallos y las reglas de seguridad estan en
`.mustflow/docs/agent-workflow.md`.

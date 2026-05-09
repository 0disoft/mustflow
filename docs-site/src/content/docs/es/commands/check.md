---
title: mf check
description: Valida el flujo de documentos mustflow en un repositorio de usuario.
---

`mf check` comprueba que los archivos mustflow instalados sean legibles y utilizables por agentes.
Después de modificar el flujo de documentos, usa `--strict` para ejecutar comprobaciones de seguridad adicionales.
Usa `--json` cuando una automatización o un agente necesite analizar los resultados.

## Criterios de validación

- `AGENTS.md` existe en la raíz del repositorio.
- `.mustflow/config/mustflow.toml` existe y puede analizarse.
- `.mustflow/config/commands.toml` existe y puede analizarse.
- `.mustflow/config/preferences.toml`, si existe, puede analizarse.
- Los campos `[map]`, `[workspace]` y `[context]` de `.mustflow/config/mustflow.toml` usan tipos válidos y rutas relativas seguras.
- `.mustflow/config/preferences.toml`, si existe, usa formas básicas válidas para idioma, formato, estilo de código, Git, documentación y preferencias de registro.
- `.mustflow/config/manifest.lock.toml`, si existe, se valida contra el contenido actual de los archivos.
- `.mustflow/skills/INDEX.md` existe.
- Los archivos `.mustflow/skills/*/SKILL.md` contienen los identificadores de sección estables requeridos.
- Los archivos `.mustflow/context/*.md`, si existen, están identificados correctamente como documentos de contexto mustflow.
- Las intenciones de `commands.toml` con `status = "configured"` incluyen la información de comando, el ciclo de vida, la política de ejecución y el tiempo de espera requeridos.
- Los ciclos de vida de larga duración no se exponen con `run_policy = "agent_allowed"`.

## Comprobaciones estrictas

```sh
npx mf check --strict
```

`--strict` habilita comprobaciones adicionales centradas en la estabilidad de la entrada del agente y la seguridad de los comandos.

- Los archivos Markdown administrados por mustflow deben conservar el frontmatter `mustflow_doc`, `locale`, `canonical`, `revision`, `authority` y `lifecycle` esperado para su ruta. Los mensajes relacionados incluyen el identificador logico del documento y la ruta relativa.
- Los documentos de contexto no deben afirmar que reemplazan instrucciones directas del usuario, código actual, pruebas o contratos de comando.
- Los anchors de código fuente deben seguir siendo pistas estructuradas de navegación. El modo estricto falla declaraciones de anchor mal formadas, IDs duplicados, instrucciones de comando o política para agentes dentro de anchors, texto parecido a secretos, anchors en rutas generadas o de vendor y etiquetas de riesgo desconocidas.
- Las señales de calidad de los anchors, como `purpose` demasiado largo, demasiados términos en `search` o demasiados anchors en un archivo, se emiten como advertencias y no hacen fallar la verificación.
- Los anchors con etiquetas de alto riesgo, como autorización, datos personales, pagos, migraciones, pérdida de datos, secretos o seguridad, usan umbrales de advertencia más bajos y se marcan para revisión cuando falta `invariant`.
- `.mustflow/skills/INDEX.md` y `.mustflow/context/INDEX.md` deben seguir siendo índices de enrutamiento, no documentos de procedimiento.
- El frontmatter de `SKILL.md` debe usar `metadata.mustflow_schema: "1"`, `metadata.mustflow_kind: procedure` y un `name` que coincida con la carpeta `.mustflow/skills/<name>/`.
- Las entradas `metadata.command_intents` del frontmatter de una skill deben referenciar intenciones declaradas en `.mustflow/config/commands.toml`.
- El cuerpo de una skill no debe afirmar que concede permiso para ejecutar comandos; esos permisos permanecen en `.mustflow/config/commands.toml`.

El modo estricto es opcional para que el flujo normal siga siendo ligero. Se recomienda después de modificar documentos mustflow, skills, contratos de comando o reglas de generación del mapa del repositorio.

## Clasificacion de errores y advertencias

`mf check` trata las infracciones estructurales como errores bloqueantes. Los errores bloqueantes terminan con código `1`; las advertencias se informan por separado y no hacen fallar el comando.

- Los errores base vienen de archivos requeridos faltantes, errores de parseo, valores de configuración inseguros, infracciones del contrato de comandos, identificadores de sección de skill faltantes, identidad inválida de documentos de contexto y desajuste del archivo de bloqueo.
- Los errores estrictos vienen de comprobaciones adicionales de identidad de documentos, rutas, metadatos de skills, anchors de código fuente, límites de comando, mapa del repositorio, retención, recibo de ejecución e higiene de contexto. Solo aparecen cuando `--strict` está habilitado.
- Las observaciones no bloqueantes pueden aparecer como `warnings` en JSON o como líneas de advertencia en la salida legible. Usa `mf doctor` cuando la automatización necesite señales informativas más amplias.

## Reglas de configuración

`mf check` trata `[map]`, `[workspace]` y `[context]` como configuración flexible con valores predeterminados, pero falla si los valores son inseguros o ambiguos.
En instalaciones antiguas, la ausencia de `manifest.lock.toml` no hace fallar la verificación. Sin embargo, si el archivo de bloqueo existe, los archivos bloqueados que falten o cuyos hashes no coincidan se informan como errores.

- `map.output`: debe ser una ruta relativa no vacía.
- `map.mode`: actualmente solo se admite `anchors_only`.
- `map.privacy`: actualmente solo se admite `minimal`.
- `map.include_nested`: debe ser booleano.
- `map.anchor_files`: debe ser una lista de rutas relativas no vacías.
- `workspace.roots`: deben ser rutas relativas dentro de la raíz actual.
- `workspace.max_depth`, `workspace.max_repositories`: deben ser enteros positivos.
- `workspace.follow_symlinks`, `workspace.stop_at_repository_root`: deben ser booleanos.
- `context.root`, `context.index`, `context.default_files` y `context.external_anchors`: deben usar rutas relativas no vacías.
- `context.read_policy`: actualmente solo se admite `task_relevant_only`.
- `context.authority`: actualmente solo se admite `contextual`.
- Los valores principales de `preferences.toml` deben ser cadenas.
- Las opciones de confirmación automática, datos sensibles y refactorizaciones automáticas de `preferences.toml` deben ser booleanas.
- `docs.update_when` en `preferences.toml` debe ser una lista de cadenas.
- Las intenciones ejecutables de `commands.toml` deben declarar `lifecycle`, `run_policy`, `timeout_seconds` y `stdin`.
- Las intenciones con `lifecycle = "oneshot"` requieren `timeout_seconds` y `stdin = "closed"`.
- Las intenciones `server`, `watch`, `interactive`, `browser` y `background` no deben exponerse como comandos predeterminados ejecutables por agentes.

## Identificadores estándar de secciones de skill

Los documentos de skill deben incluir estos identificadores estables antes de sus títulos localizados.

```text
<!-- mustflow-section: purpose -->
<!-- mustflow-section: use-when -->
<!-- mustflow-section: do-not-use-when -->
<!-- mustflow-section: required-inputs -->
<!-- mustflow-section: preconditions -->
<!-- mustflow-section: allowed-edits -->
<!-- mustflow-section: procedure -->
<!-- mustflow-section: postconditions -->
<!-- mustflow-section: verification -->
<!-- mustflow-section: failure-handling -->
<!-- mustflow-section: output-format -->
```


## Ejemplo

```sh
npx mf check
```

Si tiene éxito, imprime:

```text
mustflow check passed
```

Si falla, imprime los archivos o identificadores de sección faltantes en el error estándar y sale con el código `1`.

## Campos JSON

```sh
npx mf check --json
```

La salida legible por máquinas usa estos campos:

- `ok` (`boolean`): si todas las comprobaciones pasaron.
- `strict` (`boolean`): si las comprobaciones `--strict` estaban habilitadas.
- `issueCount` (`number`): número de problemas encontrados.
- `issues` (`string[]`): mensajes de problema legibles para personas.
- `warningCount` (`number`): número de advertencias no bloqueantes encontradas.
- `warnings` (`string[]`): mensajes de advertencia legibles para personas.
- `issueDetails` (`object[]`): detalles de problemas y advertencias legibles por máquinas. `id` es un identificador estable para límites de comando y comprobaciones estrictas relacionadas cuando corresponde, `severity` es `error` o `warning`, `mode` es `base` o `strict`, y `message` replica la entrada correspondiente de `issues` o `warnings`.

Cuando se encuentran problemas bloqueantes, la salida JSON también termina con el código `1`. Si solo hay advertencias, conserva el código de salida `0`.

## Ayuda y códigos de salida

```sh
npx mf check --help
```

La salida de ayuda está ordenada como `Usage`, `Options`, `Examples` y `Exit codes`.

- Código de salida `0`: todos los archivos y ajustes requeridos son válidos.
- Código de salida `1`: la validación encontró problemas o el comando recibió una opción desconocida.

Los agentes y la automatización deben usar los campos `ok`, `issues` e `issueDetails` de la salida `--json` en lugar de analizar texto de éxito o error legible para personas.

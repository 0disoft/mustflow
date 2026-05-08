---
title: preferences.toml
description: Declara valores predeterminados de nivel de repositorio para idioma del agente, estilo, informes de Git y documentación.
---

`.mustflow/config/preferences.toml` declara valores predeterminados de nivel de repositorio para el trabajo de agentes.

Este archivo no es la autoridad más alta. Tienen prioridad las instrucciones directas del usuario, instrucciones de nivel superior, archivos `AGENTS.md` con alcance, el estilo local existente y el contrato de comando.

## Dónde se usa

- Define valores predeterminados para idioma de respuesta, idioma de documentación, comentarios de código, registros y texto visible para usuarios.
- Define valores predeterminados para memoria derivada, como resúmenes de compactación y resúmenes de traspaso.
- Separa `profile` del proyecto, configuración regional de documentos mustflow e idioma de informes del agente.
- Registra el comportamiento de localización del producto en `[product_i18n]` solo cuando hace falta.
- Declara valores de reserva para repositorios nuevos donde no hay una convención visible.
- Mantiene desactivados de forma predeterminada la preparación, commit y push automáticos.
- Separa las sugerencias de mensajes de commit del permiso para crear commits realmente.
- Registra comprobaciones de impacto de versión sin conceder permiso para publicar ni subir versiones.
- Controla si los cambios de bajo riesgo pueden evitar la suite completa de verificación.
- Da a `mf check` un archivo de preferencias validable por máquina.
- Da a `mf help preferences` el archivo fuente que debe resumir.

## Forma básica

```toml
schema_version = "1"

[project]
convention_mode = "bootstrap"
profile = "minimal"

[language]
agent_response = "ko"
docs = "ko"

[language.code_comments]
mode = "preserve_existing"
fallback = "en"

[language.logs]
mode = "preserve_existing"
fallback = "en"

[language.memory]
summary = "agent_response"
fallback = "en"
preserve_code = true
preserve_paths = true
preserve_error_output = true

[git]
auto_stage = false
auto_commit = false
auto_push = false

[git.commit_message]
suggest = "when_changes_made"
style = "conventional"
language = "preserve_existing"
language_when_missing = "en"
max_suggestions = 2

[reporting.commit_suggestion]
enabled = true
when = "files_changed"
source = "git.commit_message"

[release.versioning]
impact_check = true
suggest_bump = true
auto_bump = false
require_user_confirmation = true
sync_template_version = true
sync_docs_examples = true
sync_tests = true

[verification.selection]
strategy = "risk_based"
prefer_related_tests = true
skip_docs_only_full_test = true
skip_low_risk_code_full_test = true
skip_translation_only_full_test = true
skip_copy_only_full_test = true
report_skipped = true
```

## Perfil e idioma

`project.profile` es el tipo de proyecto, no un país ni un idioma. El valor predeterminado es `minimal`, y los perfiles integrados son `minimal`, `oss`, `team`, `product` y `library`.

`language.agent_response` es el idioma predeterminado para los informes finales del agente.

`language.docs` es la configuración regional de los documentos mustflow.

El idioma fuente y las configuraciones regionales destino del texto visible para usuarios pertenecen a `[product_i18n]`.

```toml
[product_i18n]
enabled = true
source_locale = "en"
target_locales = ["en-US", "ko-KR"]
fallback_locale = "en"
locale_tag_format = "bcp47"
user_facing_text_policy = "externalize"
hardcoded_user_facing_strings = "avoid"
translation_policy = "update_source_mark_targets_stale"
do_not_translate = ["identifiers", "log_keys", "error_codes", "metric_names", "api_field_names"]
```

Los agentes no deben inferir el idioma del texto de producto a partir del idioma del chat del usuario. Cuando cambia la configuración regional fuente, las traducciones destino deben actualizarse o informarse como necesitadas de revisión según la política.

## Idioma de resúmenes de memoria

`language.memory.summary` controla el idioma de memoria derivada, como resúmenes de compactación, resúmenes de traspaso y candidatos a memoria de largo plazo.

El valor predeterminado es `agent_response`, que sigue el idioma del informe final del agente. Los proyectos también pueden usar `docs`, `preserve_existing` o una etiqueta de idioma explícita como `ko`, `en-US` o `zh-Hans`.

`fallback` es el idioma de reserva cuando `summary` apunta a otra preferencia o convención existente, pero no se puede resolver un idioma concreto.

`preserve_code`, `preserve_paths` y `preserve_error_output` conservan código, rutas y salida de error en su forma original independientemente del idioma del resumen. Un resumen coreano no debe traducir arbitrariamente nombres de funciones, rutas de archivo ni códigos de error.

Las instrucciones directas del usuario y el `AGENTS.md` con alcance actual tienen prioridad sobre esta preferencia.

## Modo y reserva

`preserve_existing` significa que el agente debe inspeccionar los archivos existentes y preservar la convención local.

Cuando no hay una convención visible, como en un repositorio nuevo, el agente usa el valor `fallback` de cada campo. El idioma del chat del usuario no debe decidir automáticamente el idioma de comentarios de código, registros, mensajes de error ni mensajes de commit.

La plantilla predeterminada usa reservas en inglés para comentarios de código, registros y mensajes de commit. Esto favorece la colaboración pública, la búsqueda, las herramientas de operación y los contribuyentes externos.

## Git y mensajes de commit

`git.auto_stage`, `git.auto_commit` y `git.auto_push` son `false` de forma predeterminada.

Estos valores son preferencias del repositorio, no permisos. No anulan instrucciones directas del usuario, contratos de comando en `commands.toml` ni la política de aprobación en `mustflow.toml`. `git.auto_commit = true` no concede permiso para push, y `mf init --set` solo puede establecer `git.auto_push=false`; no puede habilitar `git.auto_push=true`.

La sugerencia de mensaje de commit forma parte del informe final, no del permiso para ejecutar Git. Si cambiaron archivos y `reporting.commit_suggestion.enabled = true`, el agente puede sugerir un mensaje de commit. No debe insinuar que se creó un commit, y no debe crear uno sin una solicitud explícita del usuario.

`git.commit_message.style` acepta `conventional`, `descriptive` o `gitmoji`. El estilo `gitmoji` añade un emoji al inicio y mantiene una forma legible de estilo conventional, por ejemplo `✨ feat: add dashboard setting`.

`git.commit_message.language` acepta `preserve_existing`, `agent_response`, `docs` o una etiqueta de idioma como `ja`, `de` o `pt-BR`.

Cuando se mezclan varios cambios lógicos, el agente puede sugerir commits separados hasta `max_suggestions` en lugar de forzar todo en un único mensaje.

## Versionado de release

`[release.versioning]` controla si el agente debe revisar e informar el impacto de versión cuando cambian código, plantillas, esquemas, comportamiento de comandos, metadatos del paquete, ejemplos de documentación o salida de instalación.

Estos valores son preferencias, no permisos de release. `impact_check = true` pide al agente informar si el diff parece requerir un cambio de versión de paquete o plantilla. `suggest_bump = true` permite sugerir patch, minor o major cuando la evidencia es clara.

`auto_bump = false` mantiene intactos los archivos de versión de paquete y plantilla salvo que el usuario pida explícitamente un aumento de versión o una tarea de preparación de release. `require_user_confirmation = true` significa que el agente no debe cambiar versiones silenciosamente durante cambios normales de código.

Cuando se aprueba un cambio de versión, `sync_template_version`, `sync_docs_examples` y `sync_tests` indican al agente que mantenga alineados metadatos de paquete, manifiestos de plantilla, ejemplos de documentación y tests en el mismo cambio.

Estas preferencias no dicen dónde guarda el repositorio su versión. El agente todavía debe descubrir la fuente de versión propia del lenguaje o framework antes de proponer o editar una versión.

## Selección de verificación

`[verification.selection]` guía qué comprobaciones configuradas debe elegir el agente. No concede permiso para ejecutar comandos; la ejecución sigue dependiendo de `.mustflow/config/commands.toml`.

`strategy = "risk_based"` pide ajustar el alcance de verificación al riesgo del cambio. `prefer_related_tests = true` prioriza tests directamente relacionados cuando el repositorio declara un command intent de tests relacionados.

`skip_docs_only_full_test`, `skip_translation_only_full_test` y `skip_copy_only_full_test` cubren cambios sin código. `skip_low_risk_code_full_test` solo aplica cuando el código no afecta comportamiento público, configuración, esquemas, seguridad, migraciones u otras superficies de alto riesgo. Estas opciones omiten solo la suite completa; no significan que se omita toda verificación.

Cuando `report_skipped = true`, el informe final debe indicar qué comprobaciones amplias se omitieron y por qué.

## Reglas de validación

Cuando este archivo existe, `mf check` verifica que:

- Los valores principales de preferencia sean cadenas.
- Los valores `mode`, `fallback` y `rule` sean cadenas.
- En `[language.memory]`, `summary` y `fallback` sean cadenas, mientras `preserve_code`, `preserve_paths` y `preserve_error_output` sean booleanos.
- `auto_stage`, `auto_commit`, `auto_push`, `avoid_drive_by_refactors` e `include_sensitive_data` sean booleanos.
- `git.commit_message.style` sea `conventional`, `descriptive` o `gitmoji`.
- `git.commit_message.max_suggestions` sea un entero positivo.
- `reporting.commit_suggestion.enabled` sea booleano.
- Los campos de `[release.versioning]` sean booleanos.
- `[verification.selection]` use un valor de estrategia permitido y marcas booleanas para omitir o informar.
- `docs.update_when` sea un arreglo de cadenas.
- `project.profile` sea uno de los valores de perfil integrados.
- Cuando exista `[product_i18n]`, los campos de configuración regional, la política de traducción y las listas de no traducir usen formas básicas válidas.

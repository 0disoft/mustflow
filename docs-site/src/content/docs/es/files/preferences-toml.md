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

La sugerencia de mensaje de commit forma parte del informe final, no del permiso para ejecutar Git. Si cambiaron archivos y `reporting.commit_suggestion.enabled = true`, el agente puede sugerir un mensaje de commit. No debe insinuar que se creó un commit, y no debe crear uno sin una solicitud explícita del usuario.

Cuando se mezclan varios cambios lógicos, el agente puede sugerir commits separados hasta `max_suggestions` en lugar de forzar todo en un único mensaje.

## Reglas de validación

Cuando este archivo existe, `mf check` verifica que:

- Los valores principales de preferencia sean cadenas.
- Los valores `mode`, `fallback` y `rule` sean cadenas.
- En `[language.memory]`, `summary` y `fallback` sean cadenas, mientras `preserve_code`, `preserve_paths` y `preserve_error_output` sean booleanos.
- `auto_stage`, `auto_commit`, `auto_push`, `avoid_drive_by_refactors` e `include_sensitive_data` sean booleanos.
- `git.commit_message.max_suggestions` sea un entero positivo.
- `reporting.commit_suggestion.enabled` sea booleano.
- `docs.update_when` sea un arreglo de cadenas.
- `project.profile` sea uno de los valores de perfil integrados.
- Cuando exista `[product_i18n]`, los campos de configuración regional, la política de traducción y las listas de no traducir usen formas básicas válidas.

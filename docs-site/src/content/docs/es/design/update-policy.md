---
title: Política de mf update
description: Explica cómo mf update separa la planificación de la aplicación segura.
---

`mf update` actualiza el flujo de documentos de agente mustflow instalado para que coincida con una plantilla más nueva.

Como estos archivos contienen reglas de agente específicas del repositorio, las actualizaciones automáticas deben ser conservadoras. `mf update --dry-run` previsualiza primero el plan, y `mf update --apply` escribe solo cuando no hay elementos bloqueantes.

## Línea base

La línea base de actualización es el `content_hash` que se encuentra en `.mustflow/config/manifest.lock.toml`.

`content_hash` es el hash de contenido del archivo registrado por última vez mediante `mf init` o `mf update --apply`. Si el hash del archivo actual difiere de este valor, mustflow trata el archivo como editado localmente.

Esta política también se incluye en el objeto `policy` de `mf update --json`.
La documentación, la salida legible para personas y la salida de automatización deben permanecer coherentes.

Valores actuales de la política:

```text
baseline: manifest_lock_content_hash
allowed_apply_actions: update, create
blocking_actions: blocked-local-change, manual-review
dry_run_writes_files: false
backup_path_pattern: .mustflow/backups/<timestamp>/
never_overwrite_local_changes: true
writes_only_template_manifest_paths: true
```

## Estados

`mf update --dry-run` clasifica los archivos en estos estados:

- `unchanged`: el archivo actual coincide tanto con la línea base del lock como con la plantilla incluida.
- `update`: el archivo actual coincide con la línea base del lock, pero difiere de la plantilla incluida.
- `create`: el archivo existe en la plantilla, pero falta en el repositorio del usuario.
- `blocked-local-change`: el archivo actual difiere de la línea base del lock.
- `manual-review`: el archivo requiere revisión humana en lugar de una actualización automática.

## Reglas de aplicación

`mf update --apply` sigue estas reglas:

- No modificar automáticamente archivos `blocked-local-change`.
- No modificar automáticamente archivos `manual-review`.
- Los archivos `update` se reemplazan con contenido de plantilla después de crear una copia de seguridad.
- Los archivos `create` se escriben después de crear los directorios padre necesarios.
- Si un archivo de plantilla nuevo entra en conflicto con un archivo existente que no está en el lock, se trata como cambio local y no se sobrescribe.
- Refrescar las entradas afectadas de `manifest.lock.toml` después de una actualización correcta.
- `mf update` escribe solo archivos mustflow declarados por el manifiesto de plantilla y el archivo de bloqueo.
- Si alguna escritura falla, informar los archivos ya escritos y las rutas de copia de seguridad.

## Manejo de AGENTS.md

`AGENTS.md` es el punto de entrada raíz y requiere cuidado adicional.

`mf update` no fusiona automáticamente el archivo `AGENTS.md` completo.

Cuando un `AGENTS.md` existente está registrado como bloque administrado por mustflow, mustflow no es propietario del texto fuera de ese bloque. El bloque solo puede ser candidato a actualización automática cuando el archivo lock registra una línea base a nivel de bloque y el bloque actual todavía coincide con ella.

El esquema v1 no almacena esa línea base a nivel de bloque. En v1, los archivos `AGENTS.md` fusionados permanecen en `manual-review` en lugar de recibir un `managed-block-update`.

## Ubicación de copias de seguridad

Antes de que un elemento `update` modifique un archivo existente, las copias de seguridad se escriben bajo:

```text
.mustflow/backups/<timestamp>/
```

Las copias de seguridad sirven como última capa de protección. Su existencia no justifica sobrescribir automáticamente archivos `blocked-local-change`.

## Códigos de salida

- Salida `0`: el plan no tiene elementos bloqueantes.
- Salida `1`: hay elementos `blocked-local-change` o `manual-review`, incluso durante `--apply`.
- Salida `1`: falta el archivo de bloqueo o no es válido.
- Salida `1`: `mf update` se ejecuta sin elegir `--dry-run` o `--apply`.

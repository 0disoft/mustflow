---
title: Decisión de estructura de manifest.lock.toml
description: Por qué mustflow aún no divide los campos de hash de manifest.lock.toml.
---

mustflow mantiene actualmente un único campo `content_hash` en `manifest.lock.toml`.

Este valor no es el hash actual del archivo en vivo. Es el hash del contenido registrado durante la última instalación o actualización. El nombre es simple, pero sirve como línea base de instalación.

## Decisión

No dividir el archivo de bloqueo en `installed_hash`, `template_hash` y `current_hash` por ahora.

En su lugar, aplicar estas reglas:

- `content_hash`: línea base de instalación almacenada en el archivo de bloqueo.
- Hash del archivo actual: calculado desde el sistema de archivos en tiempo de ejecución.
- Hash de la plantilla incluida: calculado desde la plantilla dentro del paquete instalado en tiempo de ejecución.

## Justificación

El archivo de bloqueo debe registrar solo un estado de instalación reproducible.

`current_hash` cambia cada vez que el usuario edita un archivo. Guardarlo en el archivo de bloqueo obligaría a reescribirlo después de ediciones ordinarias, lo que socavaría el propósito de la línea base.

`template_hash` puede calcularse desde el paquete mustflow instalado actualmente. Cuando el paquete cambia, también cambia el hash de la plantilla incluida. Mantener un hash de plantilla obsoleto en el archivo de bloqueo podría crear fuentes de verdad en conflicto.

## Comparación de actualización

`mf update --dry-run` se basa en estas comparaciones:

```text
current file hash == lock content_hash
current file hash == bundled template hash
```

- Si la primera comparación es falsa, el archivo tiene cambios locales.
- Si la primera comparación es verdadera y la segunda es falsa, el archivo es candidato a una actualización de plantilla.
- Si ambas son verdaderas, no se necesita actualización.

## Expansión futura

La versión del esquema se incrementará y se añadirán campos si mustflow necesita:

- Comparación entre varias fuentes de plantilla.
- Actualizaciones seguras de bloques administrados como `AGENTS.md` o `.gitignore` usando líneas base a nivel de bloque.
- Verificación sin conexión de hashes por fuente de plantilla.
- Planificación reproducible de actualizaciones sin el paquete mustflow instalado.
- Plantillas firmadas o verificación de cadena de suministro.

Hasta entonces, usar un único `content_hash` como línea base de instalación es más simple y robusto.

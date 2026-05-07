---
title: Flujo operativo
description: Secuencia recomendada de comandos mf después de instalar mustflow.
---

El flujo operativo predeterminado de mustflow verifica si la raíz actual está lista para que los agentes la lean, sin crear archivos innecesarios.

## Previsualizar antes de escribir

Empieza previsualizando el plan de instalación.

```sh
npx mf init --dry-run
```

Los archivos `AGENTS.md` existentes o los directorios `.mustflow/` pueden causar conflictos, así que revisa las escrituras planificadas antes de aplicar cambios.

## Inicializar

Si el plan es correcto, inicializa el flujo de trabajo.

```sh
npx mf init --yes
```

Si `AGENTS.md` ya existe y solo requiere el bloque administrado por mustflow, usa `--merge`. Usa `--force` solo cuando los archivos existentes deban respaldarse y sobrescribirse.

## Validar

Después de inicializar, valida el flujo de documentos y la configuración.

```sh
npx mf check
npx mf check --json
```

Usa la salida predeterminada legible para personas para revisión manual. Usa salida JSON cuando un agente o automatización necesite determinar la siguiente acción.

## Inspeccionar estado

Usa el comando de estado para comprobar si los archivos instalados cambiaron desde la inicialización.

```sh
npx mf status
npx mf status --json
```

El comando compara los archivos actuales con la línea base de instalación registrada en `manifest.lock.toml`.

## Previsualizar actualizaciones

Previsualiza actualizaciones de plantilla antes de escribir cualquier cambio.

```sh
npx mf update --dry-run
npx mf update --dry-run --json
```

Si el plan es seguro, aplica explícitamente las actualizaciones limpias de plantilla.

```sh
npx mf update --apply
```

`mf update --apply` escribe solo archivos que aún coinciden con su línea base instalada.
Los archivos editados localmente y las colisiones con archivos nuevos se informan como elementos bloqueados.

## Generar mapa de navegación

Genera un mapa de navegación cuando los agentes necesiten una vista rápida de los archivos importantes de la raíz actual.

```sh
npx mf map --write
```

Usa el mapeo de repositorios anidados solo cuando las raíces de workspace estén configuradas y necesites puntos de entrada para esos repositorios hijos.

```sh
npx mf map --write --include-nested
```

`REPO_MAP.md` es un mapa de archivos ancla para la raíz mustflow actual, no una lista completa de archivos.

---
title: mustflow
description: Documentación para usuarios del flujo de trabajo legible por agentes que instala mustflow.
---

La documentación de mustflow explica los archivos y campos orientados solo a LLM que `mf init` crea en un repositorio de usuario.

## Mantener el flujo actualizado

Actualiza primero el paquete con el mismo gestor que instaló mustflow y después ejecuta `mf upgrade` en cada raíz mustflow. No instala paquetes: comprueba npm y solo actualiza archivos del proyecto cuando el plan de manifest no tiene bloqueos por cambios locales ni revisión manual.

```sh
bun update -g --latest
mf upgrade
mf check --strict
```

Usa `mf upgrade --dry-run` para revisar el plan. Un archivo de flujo personalizado se bloquea en vez de sobrescribirse; integra y revisa el cambio de plantilla necesario y actualiza el manifest lock mediante el flujo declarado por el repositorio.

## Qué explica este sitio

- Dónde se coloca cada archivo dentro del repositorio de destino.
- Qué archivos leen primero los agentes.
- Qué significa cada campo de configuración y cada sección de documento.
- Qué archivos se copian, cuáles se generan y cuáles se omiten intencionalmente.
- Cómo los contratos de comandos evitan que los agentes adivinen comandos.
- Qué contexto pueden inspeccionar los agentes mediante `mf context --json`.

## Estructura predeterminada

```text
AGENTS.md
REPO_MAP.md  # archivo generado opcional
.mustflow/
├─ config/
│  ├─ commands.toml
│  ├─ mustflow.toml
│  ├─ preferences.toml
│  └─ manifest.lock.toml  # generado tras una inicialización correcta
├─ context/
│  ├─ INDEX.md
│  └─ PROJECT.md
├─ docs/
│  └─ agent-workflow.md
├─ skills/
│  ├─ INDEX.md
│  └─ */SKILL.md
└─ state/  # generado durante el uso
   └─ runs/
      ├─ run-*/receipt.json
      └─ latest.json
```

`mf init` no crea `README.md`, `.github/`, el directorio raíz `docs/`, el directorio raíz `skills/`, código fuente ni configuración del gestor de paquetes.
`REPO_MAP.md` se genera a partir de la estructura del repositorio en lugar de copiarse desde la plantilla.
`manifest.lock.toml` lo genera `mf init` para registrar el resultado real de la instalación.
`.mustflow/state/runs/latest.json` es el puntero a la ejecución más reciente; cada directorio `run-*` conserva el recibo guardado de esa ejecución, y `latest.index.json` resume los directorios `run-*` y `verify-*` retenidos recientemente.

## Orden de lectura

1. Lee `AGENTS.md` para conocer las reglas obligatorias breves.
2. Lee `.mustflow/docs/agent-workflow.md` para conocer la política de trabajo compartida.
3. Lee `.mustflow/config/mustflow.toml` para conocer los documentos autorizados y las rutas protegidas.
4. Lee `.mustflow/config/commands.toml` para conocer las intenciones de comando ejecutables.
5. Lee `.mustflow/config/preferences.toml`, si existe, para conocer los valores predeterminados del repositorio.
6. Lee `.mustflow/skills/INDEX.md` para elegir la habilidad pertinente.
7. Lee `.mustflow/context/INDEX.md` solo cuando se necesite contexto del proyecto específico de la tarea.

Este sitio es documentación de referencia. No se copia en los proyectos de usuario.

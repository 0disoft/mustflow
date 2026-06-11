---
title: templates/default/manifest.toml
description: Metadatos de plantilla que indican a mf init qué archivos copiar y cómo manejar conflictos.
---

`templates/default/manifest.toml` contiene metadatos que `mf init` usa al instalar una plantilla.

Este archivo no se copia en los repositorios de usuario. Es la fuente de verdad del paquete sobre cómo mustflow instala una plantilla.

## Función

- Declara el identificador y la descripción de la plantilla.
- Declara el alcance de instalación para superficies de flujo de trabajo orientadas a agentes.
- Enumera los archivos que crea la plantilla.
- Define si los conflictos con archivos existentes abortan, fusionan un bloque gestionado o crean copia de seguridad y sobrescriben.
- Enumera las comprobaciones de seguimiento que una persona debe hacer después de la instalación.

## Campos

- `id`: identificador estable de plantilla.
- `name`: nombre de plantilla legible para personas.
- `version`: versión de la plantilla.
- `description`: propósito de la plantilla.
- `common_root`: carpeta base con archivos neutrales respecto al idioma que se copiarán.
- `locales_root`: carpeta base con archivos específicos de configuración regional seleccionados por `--locale`.
- `profiles.default`: tipo de proyecto usado por `mf init` cuando no se selecciona ninguno.
- `profiles.available`: tipos de proyecto permitidos por la plantilla predeterminada.
- `locales.default`: configuración regional de documentos mustflow usada por `mf init` cuando no se selecciona ninguna.
- `locales.available`: configuraciones regionales de documentos que la plantilla realmente proporciona.
- `locales.source`: configuración regional fuente canónica de los documentos de plantilla localizados.
- `install_policy.scope`: alcance de instalación. La plantilla predeterminada usa `llm_only`.
- `install_policy.copied_targets`: destinos copiados directamente.
- `install_policy.generated_targets`: destinos que pueden generarse después de la instalación.
- `install_policy.forbidden_targets`: destinos no permitidos en la plantilla predeterminada.
- `creates`: archivos que la plantilla puede crear.
- `after_install`: comprobaciones de seguimiento para el usuario.
- `i18n.metadata`: archivo de metadatos para seguimiento de traducciones.
- `i18n.source_locale`: configuración regional fuente esperada por `i18n.toml`.
- `conflict_policy`: comportamiento predeterminado ante conflictos con archivos existentes. El valor predeterminado es abortar antes de escribir.
- `conflict_policy.files`: comportamiento de conflicto por archivo.
- `conflict_policy.generated`: comportamiento de conflicto para archivos generados.

## Alcance de instalación

```toml
[install_policy]
scope = "llm_only"
copied_targets = [
  "AGENTS.md",
  ".mustflow/**",
]
generated_targets = [
  "REPO_MAP.md",
  ".mustflow/config/manifest.lock.toml",
  ".mustflow/state/**",
]
```

- `scope`: nombra la superficie de instalación predeterminada orientada a agentes que usa esta plantilla.
- `copied_targets`: rutas copiadas directamente desde la plantilla.
- `generated_targets`: rutas generadas después de leer la estructura del repositorio.
- `forbidden_targets`: rutas que no deben agregarse a la plantilla predeterminada.

La plantilla predeterminada no crea documentos raíz ni contratos propiedad del proyecto como `README.md`, `PROJECT.md`, `ROADMAP.md`, `DESIGN.md`, `GOVERNANCE.md`, `TESTING.md`, `API.md`, `project.contract.json` u `openapi.yaml`; tampoco crea `.github/`, `docs/` en la raíz, `skills/` en la raíz, código fuente ni configuración de gestor de paquetes.
Puede crear `.mustflow/context/**` porque esos archivos son contexto de flujo de trabajo de agentes para tareas específicas, no documentación general del proyecto.
`REPO_MAP.md`, `.mustflow/config/manifest.lock.toml` y `.mustflow/state/**` se generan; no se copian.
`.mustflow/state/**` contiene estado local creado durante el uso, como recibos de `mf run`.

## Perfiles e idiomas

Los perfiles describen el tipo de proyecto, no el país ni el idioma.

```toml
[profiles]
default = "minimal"
available = ["minimal", "patterns", "oss", "team", "product", "library"]

[locales]
default = "en"
available = ["en", "ko", "zh", "es", "fr", "hi"]
source = "en"
```

`common_root` proporciona configuración TOML compartida por todas las configuraciones regionales. `locales_root` proporciona documentos Markdown localizados y archivos de skills. `locales.available` incluye solo idiomas de documentos que realmente pueden instalarse. `locales.source` es la configuración regional fuente canónica usada para el seguimiento de traducciones.

## Reglas de autoría

`manifest.toml` no es un documento instalado en el proyecto de destino. Gestiona la propia plantilla de mustflow.

Cuando se agregue un archivo nuevo a una plantilla, actualiza al mismo tiempo `creates`, `install_policy` y la política de conflictos en este archivo.
Comprueba también que el lector principal del nuevo archivo sea un agente LLM.
Cuando agregues un archivo generado, actualiza juntos `generated_targets` y `conflict_policy.generated`.

`AGENTS.md` puede recibir un bloque gestionado por mustflow mediante `--merge`, pero los conflictos de archivos de configuración no se fusionan automáticamente.
`manifest.lock.toml` es reproducible después de una instalación correcta, por lo que su política de archivo generado es `regenerate`.
`.mustflow/state/**` es estado local de ejecución creado durante el uso, por lo que los flujos de actualización y eliminación deben preservarlo de forma predeterminada.

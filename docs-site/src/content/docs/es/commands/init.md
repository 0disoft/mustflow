---
title: mf init
description: Inicializa documentos mustflow en un repositorio de usuario.
---

Crea `AGENTS.md` en la raíz y guarda los documentos y ajustes administrados por mustflow bajo `.mustflow/`.

## Estructura creada

```text
AGENTS.md
.mustflow/
├─ config/
│  ├─ commands.toml
│  ├─ mustflow.toml
│  ├─ preferences.toml
│  └─ manifest.lock.toml
├─ context/
│  ├─ INDEX.md
│  └─ PROJECT.md
├─ docs/
│  └─ agent-workflow.md
└─ skills/
   ├─ INDEX.md
   ├─ code-review/SKILL.md
   ├─ docs-update/SKILL.md
   ├─ failure-triage/SKILL.md
   └─ test-maintenance/SKILL.md
```

`REPO_MAP.md` no se copia desde una plantilla estática; se genera bajo demanda a partir de la estructura del repositorio.
`manifest.lock.toml` también se genera después de un `mf init` correcto para registrar el estado real de la instalación.
mustflow no crea `DESIGN.md`. Si un proyecto ya incluye uno, `mf map` puede tratarlo como un ancla opcional de diseño visual.

## Estructura de la fuente de plantillas

Las rutas de destino de instalación permanecen estables, pero la plantilla incluida en el paquete se divide por propósito:

```text
templates/default/
├─ common/
│  └─ .mustflow/config/
└─ locales/
   ├─ en/
   │  ├─ AGENTS.md
   │  └─ .mustflow/
   ├─ ko/
   │  ├─ AGENTS.md
   │  └─ .mustflow/
   ├─ zh/
   ├─ es/
   ├─ fr/
   └─ hi/
```

`common/` contiene configuración TOML independiente del idioma. `locales/<locale>/` contiene documentos Markdown y archivos de skill seleccionados por `--locale`.

## Reglas

- Los archivos copiados se limitan a documentos de flujo de trabajo leídos directamente por agentes LLM.
- Instalar el paquete por sí solo no modifica archivos del usuario.
- De forma predeterminada, los conflictos con archivos existentes hacen que el proceso se interrumpa antes de escribir archivos.
- Si `AGENTS.md` ya existe, puede usarse `--merge` para insertar solo el bloque administrado por mustflow.
- `--force` crea copias de seguridad de los archivos en conflicto bajo `.mustflow/backups/` antes de sobrescribirlos.
- `REPO_MAP.md` se genera a partir de la estructura del repositorio en lugar de copiarse desde una plantilla estática.
- `manifest.lock.toml` registra hashes de archivos instalados, el identificador de plantilla y la acción aplicada a cada archivo.
- `.mustflow/context/` contiene contexto de proyecto orientado a agentes, no un archivo general de documentación.
- `README.md`, `.github/` y los directorios existentes `config/`, `docs/` y `skills/` no se modifican.
- No se crea código fuente, configuración del gestor de paquetes ni configuración de CI.
- `--dry-run` imprime el plan de instalación sin escribir archivos.
- `manifest.lock.toml` no se escribe si la instalación se interrumpe por conflictos o se ejecuta con `--dry-run`.

## Ejemplos

```sh
npx mf init
npx mf init --yes
npx mf init --dry-run
npx mf init --merge
npx mf init --force
npx mf init --profile product --locale ko --agent-lang ko
npx mf init --profile product --product-source-locale en --product-locale ko-KR
```

## Perfiles e idiomas

`profile` describe el tipo de proyecto, no un país ni un idioma.

Los perfiles integrados admitidos son:

- `minimal`
- `oss`
- `team`
- `product`
- `library`

`--locale` especifica el idioma de los documentos mustflow instalados. La plantilla predeterminada actual proporciona `en`, `ko`, `zh`, `es`, `fr` y `hi`, con `en` como valor predeterminado.

`--agent-lang` es el idioma predeterminado de los informes finales del agente. Puede diferir del idioma de los documentos mustflow.

La localización del texto de producto visible para usuarios se registra por separado con `--product-source-locale` y `--product-locale`. Estos valores se escriben en `[product_i18n]` dentro de `.mustflow/config/preferences.toml`; no son el idioma de los documentos mustflow ni el idioma de salida de la CLI.

Por ejemplo, un proyecto puede pedir informes de agente en coreano, instalar documentos mustflow en coreano, conservar las cadenas fuente del producto en inglés y admitir usuarios coreanos:

```sh
npx mf init --profile product --locale ko --agent-lang ko --product-source-locale en --product-locale ko-KR
```

## Salida estructurada

`mf init` actualmente no proporciona un formato de salida JSON.

Los scripts automatizados no deben analizar salida legible para personas. Después de la instalación, usa `mf status --json` o `mf check --json` para verificar el resultado.

## Ayuda y códigos de salida

```sh
npx mf init --help
```

La salida de ayuda está ordenada como `Usage`, `Options`, `Examples` y `Exit codes`.

- Código de salida `0`: instalación completada, operación sin cambios completada o plan `--dry-run` impreso.
- Código de salida `1`: opciones desconocidas, conflictos de archivos u opciones incompatibles detuvieron la escritura.

Las opciones desconocidas imprimen el motivo del error junto con la indicación de ejecutar `mf init --help`.

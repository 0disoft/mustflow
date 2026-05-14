---
title: mf init
description: Inicializa documentos mustflow en un repositorio de usuario.
---

Crea `AGENTS.md` en la raíz y guarda los documentos y ajustes administrados por mustflow bajo `.mustflow/`.

## Estructura creada

```text
AGENTS.md
.gitignore
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
   ├─ codebase-orientation/SKILL.md
   ├─ diff-risk-review/SKILL.md
   ├─ docs-prose-review/SKILL.md
   ├─ docs-update/SKILL.md
   ├─ failure-triage/SKILL.md
   ├─ project-context-authoring/SKILL.md
   ├─ readme-authoring/SKILL.md
   ├─ skill-authoring/SKILL.md
   ├─ security-regression-tests/SKILL.md
   ├─ test-design-guard/SKILL.md
   ├─ test-maintenance/SKILL.md
   ├─ vertical-slice-tdd/SKILL.md
   ├─ visual-review-artifact/SKILL.md
   └─ web-asset-optimization/SKILL.md
```

`REPO_MAP.md` no se copia desde una plantilla estática; se genera bajo demanda a partir de la estructura del repositorio.
`manifest.lock.toml` también se genera después de un `mf init` correcto para registrar el estado real de la instalación.
mustflow no crea `DESIGN.md`. Si un proyecto ya incluye uno, `mf map` puede tratarlo como un ancla opcional de diseño visual.

## Estructura de la fuente de plantillas

Las rutas de destino de instalación permanecen estables, pero la plantilla incluida en el paquete se divide por propósito:

```text
templates/default/
├─ common/
│  ├─ gitignore.mustflow
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

`common/` contiene configuración TOML independiente del idioma y el fragmento administrado de `.gitignore`. `locales/<locale>/` contiene documentos Markdown y archivos de skill seleccionados por `--locale`.

## Reglas

- Los archivos copiados se limitan a documentos de flujo de trabajo leídos directamente por agentes LLM.
- Instalar el paquete por sí solo no modifica archivos del usuario.
- De forma predeterminada, los conflictos con archivos existentes hacen que el proceso se interrumpa antes de escribir archivos.
- Si `AGENTS.md` ya existe, puede usarse `--merge` para insertar solo el bloque administrado por mustflow.
- `mf init` crea `.gitignore` si falta. Si ya existe, mustflow actualiza solo su bloque administrado y conserva las reglas del usuario.
- El bloque administrado de `.gitignore` ignora solo artefactos locales generados por mustflow: `.mustflow/cache/`, `.mustflow/state/` y `.mustflow/backups/`. Salidas del proyecto como `repos/`, `node_modules/`, `dist/` o `.env` siguen siendo responsabilidad del usuario.
- `--force` crea copias de seguridad de los archivos en conflicto bajo `.mustflow/backups/` antes de sobrescribirlos.
- `REPO_MAP.md` se genera a partir de la estructura del repositorio en lugar de copiarse desde una plantilla estática.
- `manifest.lock.toml` registra hashes de archivos de workflow instalados, el identificador de plantilla y la acción aplicada a cada archivo rastreado. El bloque de soporte de `.gitignore` no se rastrea en el lock file.
- `.mustflow/context/` contiene contexto de proyecto orientado a agentes, no un archivo general de documentación.
- `README.md`, `.github/` y los directorios existentes `config/`, `docs/` y `skills/` no se modifican.
- No se crea código fuente, configuración del gestor de paquetes ni configuración de CI.
- El manifest de plantilla se rechaza si enumera destinos de instalación fuera de `AGENTS.md` y `.mustflow/**`.
- `--dry-run` imprime el plan de instalación sin escribir archivos.
- `manifest.lock.toml` no se escribe si la instalación se interrumpe por conflictos o se ejecuta con `--dry-run`.

## Ejemplos

```sh
npx mf init
npx mf init --yes
npx mf init --dry-run
npx mf init --interactive
npx mf init --set git.auto_commit=true
npx mf init --merge
npx mf init --force
npx mf init --profile product --locale ko --agent-lang ko
npx mf init --profile product --product-source-locale en --product-locale ko-KR
```

En una terminal interactiva, `mf init` pregunta por el idioma de los documentos,
el perfil del proyecto y el idioma de los informes del agente. `--interactive`
fuerza ese flujo de preguntas. Cuando se activan las preferencias avanzadas, el
asistente también puede definir el staging automático, los commits automáticos,
el idioma de los mensajes de commit y las sugerencias de mensajes de commit.
`--yes` instala los valores predeterminados en inglés sin preguntas.

`--set` puede definir una lista breve de preferencias permitidas durante la
instalación:

- `git.auto_stage`
- `git.auto_commit`
- `git.auto_push=false`
- `git.commit_message.style`
- `git.commit_message.language`
- `git.commit_message.max_suggestions`
- `git.commit_message.include_body`
- `git.commit_message.split_when_multiple_concerns`
- `reporting.commit_suggestion.enabled`
- `release.versioning.impact_check`
- `release.versioning.suggest_bump`
- `release.versioning.auto_bump`
- `release.versioning.require_user_confirmation`
- `release.versioning.sync_template_version`
- `release.versioning.sync_docs_examples`
- `release.versioning.sync_tests`
- `verification.selection.strategy`
- `verification.selection.prefer_related_tests`
- `verification.selection.skip_docs_only_full_test`
- `verification.selection.skip_low_risk_code_full_test`
- `verification.selection.skip_translation_only_full_test`
- `verification.selection.skip_copy_only_full_test`
- `verification.selection.report_skipped`
- `testing.authoring.new_test_policy`
- `testing.authoring.prefer_existing_tests`
- `testing.authoring.require_new_test_rationale`
- `language.memory.summary`

`git.commit_message.style` acepta `conventional`, `descriptive` o `gitmoji`. El estilo `gitmoji` sugiere mensajes como `✨ feat: add dashboard setting`, pero sigue siendo una sugerencia de mensaje, no permiso para crear commits.

`git.commit_message.language` acepta `preserve_existing`, `agent_response`, `docs` o una etiqueta de idioma como `ja`, `de` o `pt-BR`.

`verification.selection.strategy` acepta `risk_based`, `targeted` o `full`.

`testing.authoring.new_test_policy` acepta `evidence_required`, `manual_approval` o `broad`.

`mf init` solo permite `git.auto_push=false`, lo que puede devolver un repositorio al valor seguro predeterminado. No puede habilitar `git.auto_push=true`; si un repositorio realmente necesita ese comportamiento, edita el archivo manualmente después de la instalación.

## Límites de configuración

`mf init` no inicializa una aplicación lista para compilar. Solo instala las reglas de workflow que los agentes de código LLM necesitan para leer las instrucciones del repositorio, evitar adivinar comandos y verificar su trabajo.

| Momento | Configuración |
| --- | --- |
| Preguntas interactivas | Idioma de los documentos, perfil del proyecto, idioma del informe final del agente y preferencias avanzadas opcionales de Git/reportes. |
| Solo por CLI durante init | Idioma fuente del producto, idiomas objetivo del producto y overrides de preferencias permitidos con `--set`. |
| Editar después de instalar | Contratos de comandos de test, lint, build y ejecución larga; políticas de aprobación y aislamiento; contexto del proyecto; skills personalizadas; CI; README; y ajustes de la aplicación. |

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

---
title: Recursos de skills
description: Explica cómo añadir referencias, assets, scripts y resources.toml cuando el alcance de un skill supera SKILL.md.
---

Un skill de mustflow empieza con un único archivo `.mustflow/skills/<name>/SKILL.md`.

No crees carpetas vacías `references/`, `assets/` o `scripts/` por adelantado. Añade recursos de apoyo solo cuando el documento del skill crezca demasiado o cuando realmente se necesite un helper repetible.

## Principios base

- `SKILL.md` es el punto de entrada del skill.
- `resources.toml` existe solo cuando hay recursos de apoyo.
- `references/` almacena material largo de solo lectura, como rúbricas, ejemplos y notas de contexto.
- `assets/` almacena archivos reutilizables, como plantillas, entradas de ejemplo y esquemas.
- `scripts/` existe solo cuando el skill requiere un helper dedicado.
- Los scripts no se invocan directamente desde `SKILL.md`; se resuelven mediante `.mustflow/config/commands.toml`.

## Estructura opcional

```text
.mustflow/skills/<name>/
├─ SKILL.md
├─ resources.toml        # opcional: solo cuando existen recursos de apoyo
├─ references/           # opcional: material de referencia de solo lectura
├─ assets/               # opcional: plantillas, esquemas, entradas de ejemplo
└─ scripts/              # opcional: helpers conectados a intenciones de comando
```

Esto no es andamiaje obligatorio para cada skill. La plantilla predeterminada proporciona `SKILL.md`; otros archivos y carpetas deben añadirse solo cuando el skill realmente los necesita.

## resources.toml

`resources.toml` es un índice opcional para recursos de apoyo. No reemplaza el cuerpo del skill. Ayuda a los agentes a decidir qué material puede leerse o ejecutarse, y bajo qué condiciones.

Estructura esperada:

```toml
schema_version = "1"

[resources."references/severity-rubric.md"]
type = "reference"
purpose = "Rubric for classifying review finding severity."
read_when = ["finding_severity_is_unclear"]
required = false

[resources."assets/templates/review-report.md"]
type = "asset"
asset_kind = "template"
purpose = "Template for review report output."
required = false

[resources."scripts/validate-review-report.py"]
type = "script"
language = "python"
purpose = "Validates the review report format."
run_policy = "requires_command_contract"
command_intent = "review_report_validate"
network = false
destructive = false
writes = []
dependencies = ["python>=3.10"]
```

## references/

Usa `references/` para material largo que los agentes leen solo cuando lo necesitan.

Ejemplos:

- Rúbricas de decisión
- Casos de fallo y correcciones
- Ejemplos de salida
- Notas de contexto

No almacenes aquí secretos, registros de ejecución sin procesar, cachés generadas ni archivos grandes.

## assets/

Usa `assets/` para archivos estáticos que apoyan al skill.

Ejemplos:

- Plantillas de informe
- Archivos de entrada de ejemplo
- Esquemas de validación
- Pequeños datos de muestra

No almacenes aquí binarios grandes, salida de compilación, cachés ni secretos.

## scripts/

Usa `scripts/` para helpers dedicados del skill.

Cada script debe:

- Proporcionar salida de ayuda.
- Devolver un código de salida distinto de cero en caso de fallo.
- Declarar reglas claras de entrada y salida.
- Declarar escrituras de archivos o acceso de red mediante `resources.toml` y `commands.toml`.
- Evitar comportamiento destructivo de forma predeterminada.

Los agentes no deben adivinar rutas de scripts y ejecutarlas directamente. Cuando se necesite ejecución, primero deben resolver la intención de comando relacionada en `.mustflow/config/commands.toml`.

## Relación con skills/INDEX.md

`.mustflow/skills/INDEX.md` enumera skills, no todos los archivos de apoyo bajo cada skill.

Los recursos de apoyo se indexan mediante el `resources.toml` local del skill.

## Dirección del registro comunitario de skills

El núcleo de mustflow no debe expandir indefinidamente su conjunto de skills predeterminados. La plantilla predeterminada debe mantenerse pequeña, mientras que skills adicionales pueden provenir más adelante de un repositorio comunitario separado.

Los nombres de repositorio deben seguir la convención de mustflow, como `mustflow-skills` o `mustflow-community-skills`. Evita nombres demasiado amplios o fáciles de confundir con otros ecosistemas de skills.

Si se introduce un repositorio comunitario de skills, cada skill debe proporcionar tanto `SKILL.md` como un `skill.toml` específico de mustflow. El archivo `skill.toml` debe declarar el identificador del skill, versión, rango compatible de mustflow, licencia, scripts incluidos, uso de red, alcance de escritura y nivel de riesgo.

Los grupos de skills deben llamarse `pack` o `bundle`, no automation skills. Un pack instala skills; no debe ejecutar comandos ni editar `.mustflow/config/commands.toml` automáticamente. Las intenciones de comando requeridas o recomendadas deben informarse y luego ser declaradas por el usuario para el proyecto actual.

Los futuros comandos `mf skill add` o `mf pack add` deben implementar estas reglas de seguridad:

- Previsualizar archivos modificados, scripts incluidos, permisos y nivel de riesgo antes de instalar.
- Nunca ejecutar scripts durante la instalación.
- Registrar fuente, versión y hashes en un archivo de bloqueo como `.mustflow/skills.lock.toml`.
- Permitir que `mf skill audit` verifique el archivo de bloqueo, hashes actuales, enlaces de script a intención de comando y skills obsoletos.
- Mantener la exportación a ubicaciones nativas de herramientas como adaptador opcional, no como destino de instalación predeterminado.

## Reglas de comprobación

`mf check --strict` verifica:

- Los archivos registrados existen.
- Los archivos registrados están bajo `references/`, `assets/` o `scripts/`.
- `scripts/` no contiene helpers no registrados.
- Los scripts usan `run_policy = "requires_command_contract"` y se enlazan a una intención de comando configurada en `commands.toml`.
- Los scripts no habilitan acceso de red ni comportamiento destructivo por defecto.
- Las declaraciones `writes` de scripts se restringen a la carpeta del skill mediante rutas relativas.
- Cada carpeta de skill contiene un `SKILL.md`.

La plantilla predeterminada incluye ahora el primer skill con recursos: `visual-review-artifact/resources.toml`. Añade más índices de recursos solo cuando un skill necesite referencias, assets o scripts de apoyo.
Las comprobaciones de archivos grandes, secretos y cachés pueden ampliarse como comprobaciones de seguridad de repositorio separadas, similares a la validación de retención y archivos de contexto.

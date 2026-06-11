---
title: Elementos de trabajo
description: Cómo los elementos de trabajo locales opcionales pueden ampliar mustflow sin perder traspasos acotados.
---

Los elementos de trabajo son una superficie opcional de mustflow para capturar issues diferidos, propuestas y puntos de reinicio dentro del repositorio.

La plantilla predeterminada mantiene esta superficie inactiva con `work_items = "disabled"` y `handoff.mode = "report_only"` hasta que el proyecto elija un ciclo de vida acotado.

## Valores predeterminados

```toml
[capabilities]
work_items = "disabled"

[handoff]
enabled = false
mode = "report_only"
```

Esto significa que los agentes deben informar trabajo inacabado en el traspaso final, en lugar de crear nuevos archivos de backlog.

## Por qué el valor predeterminado está inactivo

- La instalación predeterminada debe seguir siendo pequeña hasta que un proyecto opte por un ciclo de vida de elementos de trabajo.
- Los archivos locales de issues pueden quedar obsoletos y duplicar gestores de issues existentes.
- Registros de fallos, rutas internas, nombres de clientes y fragmentos de secretos podrían filtrarse en documentos.
- Si los agentes crean y cierran elementos de trabajo libremente, el límite de decisión humana se vuelve confuso.

## Dirección

Cuando se habilita la escritura de elementos de trabajo, `.mustflow/work-items/` es más claro que `.mustflow/pr/`. Los archivos locales representan trabajo propuesto y notas de solución, no pull requests reales.

```text
.mustflow/
└─ work-items/
   ├─ README.md
   ├─ issues/
   │  └─ MF-0001.md
   └─ proposals/
      └─ MF-0001-P001.md
```

`issues/` contiene errores diferidos, tareas y solicitudes de función. `proposals/` contiene cambios propuestos para un issue específico. Las ramas, diffs, revisiones y merges siguen siendo responsabilidad de Git y las plataformas de colaboración.

## Permisos de agentes

Incluso cuando se habiliten elementos de trabajo opcionales, los permisos deben seguir siendo estrechos.

- Los agentes pueden crear candidatos de issue y proponer cambios.
- Los agentes no deben cerrar issues ni aceptar propuestas sin aprobación humana.
- Los agentes no deben afirmar que existe un pull request real.
- Los agentes no deben almacenar secretos, datos de clientes ni registros extensos de fallos en elementos de trabajo.

## Candidatos a comandos

```sh
mf work list
mf work show MF-0001
mf work propose MF-0001
mf work check
```

Agrega comandos de escritura y ciclo de vida de forma incremental, con esquemas acotados, contratos de comando, redacción y reglas de aprobación humana antes de que los agentes puedan crear o cerrar registros automáticamente.

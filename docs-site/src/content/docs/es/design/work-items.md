---
title: Elementos de trabajo
description: Por qué los elementos de trabajo locales no se instalan por defecto y cómo mustflow podría admitirlos en el futuro.
---

De forma predeterminada, mustflow no crea carpetas locales de issues ni propuestas.

Los elementos de trabajo basados en archivos pueden ser útiles, pero instalarlos por defecto expandiría mustflow desde un flujo de documentos para agentes hasta un gestor local de issues. Actualmente, `.mustflow/config/mustflow.toml` solo declara `work_items = "disabled"` y `handoff.mode = "report_only"`.

## Valores predeterminados

```toml
[capabilities]
work_items = "disabled"

[handoff]
enabled = false
mode = "report_only"
```

Esto significa que los agentes deben informar trabajo inacabado en el traspaso final, en lugar de crear nuevos archivos de backlog.

## Por qué no son predeterminados

- El propósito principal de `mf init` es configurar archivos de flujo de trabajo solo para LLM.
- Los archivos locales de issues pueden quedar obsoletos y duplicar gestores de issues existentes.
- Registros de fallos, rutas internas, nombres de clientes y fragmentos de secretos podrían filtrarse en documentos.
- Si los agentes crean y cierran elementos de trabajo libremente, el límite de decisión humana se vuelve confuso.

## Dirección opcional

Si esto se convierte en una función opcional en el futuro, `.mustflow/work-items/` es más claro que `.mustflow/pr/`. Los archivos locales representan trabajo propuesto y notas de solución, no pull requests reales.

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

## Candidatos a comandos futuros

```sh
mf work list
mf work show MF-0001
mf work propose MF-0001
mf work check
```

Estos comandos están fuera del alcance de implementación actual. mustflow debe estabilizar el flujo basado en archivos, el contrato de comando y el flujo de validación antes de añadir esta superficie opcional.

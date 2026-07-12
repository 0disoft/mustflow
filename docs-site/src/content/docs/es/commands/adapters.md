---
title: mf adapters
description: Inspecciona la compatibilidad de instrucciones del host sin generar adaptadores.
---

`mf adapters status` inspecciona de forma read-only los archivos de instrucciones específicos del host en la raíz actual.

Informa archivos de agente existentes, superficies opcionales, notas de compatibilidad, cambios necesarios y el límite de autoridad de comandos. No crea adaptadores ni cambia la configuración del host.

```sh
npx mf adapters status
npx mf adapters status --json
```

`required_changes` contiene los hallazgos que deben resolverse; `compatibility_notes` contiene información. Ningún resultado concede autoridad fuera de `.mustflow/config/commands.toml`. El código `0` indica inspección correcta y `1` entrada inválida.

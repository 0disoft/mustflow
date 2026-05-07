---
title: Comprobaciones de publicación
description: Flujo de verificación que debe ejecutarse antes de publicar el paquete npm de mustflow.
---

mustflow publica una CLI y plantillas juntas mediante npm.

Antes de publicar, no dependas solo de comprobaciones hechas sobre el árbol fuente local. Empaqueta el artefacto npm, instálalo en un proyecto temporal y verifica los comandos públicos con `npx mf`.

## Comandos

```sh
bun run release:check
```

## Propósito

- `bun run release:check`: ejecuta comprobaciones de CLI, comprobaciones de documentación y verifica la instalación real del paquete npm.
- `bun run check:pack`: usa `npm pack --dry-run --json` para inspeccionar el contenido del paquete. Esto también ejecuta primero `prepack`.
- `bun run check:install`: crea un `.tgz` real, lo instala en un proyecto temporal y ejecuta el flujo público de `npx mf`.
- `bun run docs:check`: construye el sitio de documentación y verifica la navegación.

## Despliegue del sitio de documentación

El código fuente del sitio de documentación está en `docs-site/` en la rama `main`.

En la configuración de GitHub Pages, usa `GitHub Actions` como fuente de publicación en lugar de `Deploy from a branch`.

`.github/workflows/docs-site.yml` se ejecuta cuando cambian `docs-site/**` o el propio archivo de automatización. Dentro de `docs-site/`, ejecuta:

```sh
bun install --frozen-lockfile
bun run check
```

Después de ejecutarse, sube `docs-site/dist` como artefacto de GitHub Pages y lo despliega en el entorno Pages.

Ten en cuenta que `docs-site/dist` es salida generada y no debe confirmarse en el repositorio.

## Flujo check:install

`check:install` verifica el siguiente flujo del paquete público:

```sh
npm pack
npm install -D ./mustflow-*.tgz
npx mf --version
npx mf init --dry-run
npx mf init --yes
npx mf check --strict --json
npx mf doctor --strict --json
npx mf context --json
npx mf run mustflow_check --json
npx mf status --json
npx mf index --json
npx mf search mustflow_check --json
npx mf update --dry-run --json
npx mf map --write
```

Esto garantiza que la salida empaquetada de `dist/`, `templates/`, el contrato de comando y el flujo de índice local funcionen correctamente juntos después de la instalación.

## Solución de fallos

- Fallo de `npm pack`: revisa los metadatos del paquete y los archivos incluidos.
- Fallo de `npm install`: revisa dependencias, estructura del paquete y compatibilidad con npm.
- Fallo de `npx mf init`: es posible que la CLI publicada no pueda localizar las plantillas incluidas.
- Fallo de `check/doctor/status/update/map`: los archivos generados, el contrato de comando, el índice local o el flujo de `manifest.lock` pueden estar rotos después de la instalación.

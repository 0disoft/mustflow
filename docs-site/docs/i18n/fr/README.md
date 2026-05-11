# Site de documentation mustflow

Langues : [Anglais](../../../README.md) · [Coréen](../ko/README.md) · [Chinois](../zh/README.md) · [Espagnol](../es/README.md) · [Français](README.md) · [Hindi](../hi/README.md)

Voici le site de documentation déployé sur `0disoft.github.io/mustflow`.

Le site de documentation n'est pas installé dans les dépôts utilisateur via
`mf init`. Il fournit des guides détaillés sur les fichiers et configurations
créés par mustflow.

Le contenu du site est localisé dans `src/content/docs/<locale>/`.

## Commandes

```sh
bun run dev
bun run check
bun run build
bun run preview
```

Depuis la racine du dépôt, utilisez ces commandes enveloppes :

```sh
bun run docs:dev
bun run docs:check
bun run docs:build
bun run docs:preview
```

Pour la vérification de documentation par un agent depuis la racine du dépôt,
privilégiez l'intent mustflow configuré :

```sh
mf run docs_validate
```

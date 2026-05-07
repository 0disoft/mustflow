# Configuration de docs-site

Langues : [Anglais](../../../../../src/config/README.md) · [Coréen](../../../ko/src/config/README.md) · [Chinois](../../../zh/src/config/README.md) · [Espagnol](../../../es/src/config/README.md) · [Français](README.md) · [Hindi](../../../hi/src/config/README.md)

Ce répertoire sépare la configuration Starlight en fichiers source ciblés.

- `site.mjs` : nom du site et URL de déploiement.
- `head.mjs` : balises ajoutées au `<head>` de chaque page de documentation.
- `locales.mjs` : liste des langues de documentation.
- `machine-readable.mjs` : métadonnées publiques pour `ai.txt`, `llms.txt`,
  `llms-full.txt` et `robots.txt`.
- `navigation.mjs` : liens et groupes de documentation affichés dans la barre
  latérale.
- `sidebar.mjs` : point d'entrée de la barre latérale transmis à Starlight.
- `styles.mjs` : ordre de chargement du CSS global.
- `starlight.mjs` : options Starlight composées à partir des fichiers
  ci-dessus.

Lorsqu'un nouveau document doit apparaître dans la barre latérale, ajoutez son
lien à `navigation.mjs`. Lorsqu'un fichier de style global est ajouté, mettez
`styles.mjs` à jour en même temps. Lorsqu'un script de navigateur est ajouté,
enregistrez-le dans `head.mjs`.

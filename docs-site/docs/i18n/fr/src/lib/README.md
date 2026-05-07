# Bibliothèque docs-site

Langues : [Anglais](../../../../../src/lib/README.md) · [Coréen](../../../ko/src/lib/README.md) · [Chinois](../../../zh/src/lib/README.md) · [Espagnol](../../../es/src/lib/README.md) · [Français](README.md) · [Hindi](../../../hi/src/lib/README.md)

Ce répertoire contient de petits assistants de génération partagés par plusieurs
routes de docs-site.

- `machine-readable.mjs` : génère les réponses `ai.txt`, `llms.txt`,
  `llms-full.txt` et `robots.txt`.

Gardez les fichiers de route légers. Gérez les valeurs sources du texte de
métadonnées publiques dans `../config/machine-readable.mjs`.

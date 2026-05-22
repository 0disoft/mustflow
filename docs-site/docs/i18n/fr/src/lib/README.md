# Bibliothèque de docs-site

Langues : [Anglais](../../../../../src/lib/README.md) · [Coréen](../../../ko/src/lib/README.md) · [Chinois](../../../zh/src/lib/README.md) · [Espagnol](../../../es/src/lib/README.md) · [Français](README.md) · [Hindi](../../../hi/src/lib/README.md)

Ce répertoire fait office de couche d'utilitaires partagés pour le site de documentation. Il contient des assistants de génération de code purs et réutilisables qui sont partagés entre plusieurs routes, pages ou points d'accès Astro.

---

## Principes architecturaux : Contrôleurs fins (Thin Controllers)

Afin de garantir que le site de documentation reste performant et facile à tester, le projet suit l'architecture **Contrôleur fin / Route fine** :
* **Pas de logique complexe en ligne** : Les modèles de route et les pages Astro doivent se concentrer uniquement sur le traitement des requêtes et l'assemblage de la mise en page (layout).
* **Découplage fonctionnel** : Le formatage complexe des métadonnées, le traitement du manifeste et la désinfection (sanitization) des chaînes de caractères doivent résider dans des fonctions d'assistance pures au sein de ce répertoire.
* **Testabilité** : Maintenir des assistants purs et isolés permet de les tester unitairement sans avoir à lancer l'intégralité du moteur de rendu Astro.

---

## Registre des fichiers

* **`machine-readable.mjs`** : Contient le moteur de rendu principal qui agrège les paramètres structurés de `../config/machine-readable.mjs` et les traduit dans des formats de texte brut pour les points d'accès `ai.txt`, `llms.txt`, `llms-full.txt` et `robots.txt`.

---

## Directives pour l'introduction de nouveaux assistants

Lors de l'ajout d'un nouvel assistant ou utilitaire :
1. Assurez-vous que la fonction est **pure** (produit des sorties identiques pour des entrées identiques, sans effets secondaires).
2. Découplez-la des contextes spécifiques à Astro (ex : évitez de faire référence directement aux variables globales d'Astro ou aux API du navigateur, sauf si cela est strictement requis).
3. Mettez à jour ce registre avec le but de l'assistant et ses fichiers de référence.

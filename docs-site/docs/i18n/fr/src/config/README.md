# Configuration de docs-site

Langues : [Anglais](../../../../../src/config/README.md) · [Coréen](../../../ko/src/config/README.md) · [Chinois](../../../zh/src/config/README.md) · [Espagnol](../../../es/src/config/README.md) · [Français](README.md) · [Hindi](../../../hi/src/config/README.md)

Ce répertoire héberge les composants de configuration pour Starlight. Plutôt que de s'appuyer sur un seul fichier de configuration monolithique, `docs-site` adopte une approche de conception modulaire où les options sont divisées en fichiers ciblés et spécifiques à chaque domaine.

---

## Justification de la conception

La maintenance d'un site de documentation global nécessite de faire évoluer simultanément la localisation, le style, les métadonnées et la navigation. En découplant les configurations dans des modules `.mjs` individuels, nous garantissons :
* **Isolation des préoccupations** : Les modifications apportées à la barre latérale de navigation n'ont aucun impact sur les métadonnées SEO ou les routes linguistiques.
* **Fusions plus sûres** : Plusieurs contributeurs peuvent mettre à jour les traductions et les liens de navigation simultanément avec un risque minimal de conflit git.

---

## Carte des fichiers de configuration

* **`site.mjs`** : Contiene les métadonnées principales du site, telles que l'URL de production, le titre et les paramètres par défaut.
* **`head.mjs`** : Régule les balises personnalisées injectées dans le `<head>` HTML de chaque page de documentation. Enregistrez ici les outils d'analyse, les liens CDN externes ou les scripts globaux.
* **`locales.mjs`** : Définit les langues de traduction prises en charge et les priorités de mappage.
* **`machine-readable.mjs`** : Déclare les paramètres de métadonnées publiques utilisés pour générer `ai.txt`, `llms.txt`, `llms-full.txt` et `robots.txt`.
* **`navigation.mjs`** : Le registre faisant autorité pour la structure de la barre latérale de documentation, les groupes imbriqués et les liens.
* **`sidebar.mjs`** : Orchestre et transmet la configuration de navigation structurée directement à Starlight.
* **`styles.mjs`** : Régule l'ordre strict de chargement et d'héritage des fichiers de style globaux.
* **`starlight.mjs`** : Le compositeur central qui agrège dynamiquement tous les modules ci-dessus dans les paramètres finaux de Starlight.

---

## Le rôle de `machine-readable.mjs` (Alignement IA & LLM)

Avec l'essor des assistants de codage IA et des robots d'indexation LLM, la documentation moderne doit être facilement indexable par les machines.
* **`llms.txt` & `llms-full.txt`** : Points d'accès standardisés présentant des structures markdown brutes et condensées optimisées pour les LLM.
* **`ai.txt`** : Fournit des indices et des limites de contexte strictes spécifiquement conçus pour les outils de développement et les agents de codage qui lisent ce site.
* Les propriétés configurées dans `machine-readable.mjs` régissent directement la manière dont ces fichiers sont rendus.

---

## Guides de maintenance étape par étape

### Ajouter un nouveau document à la barre latérale
1. Rédigez ou placez votre nouveau fichier markdown dans `src/content/docs/<locale>/path/to/file.md`.
2. Ouvrez `src/config/navigation.mjs`.
3. Localisez le tableau de la section cible. Ajoutez votre entrée :
   ```javascript
   { label: 'Ma nouvelle page', slug: 'path/to/file' }
   ```
4. Vérifiez que la navigation se compile avec succès en exécutant `bun run docs:check`.

### Enregistrer un fichier de style global
1. Créez votre fichier CSS sous `src/styles/`.
2. Ouvrez `src/config/styles.mjs`.
3. Ajoutez le chemin relatif de votre feuille de style au tableau exporté, en veillant à respecter l'ordre de la cascade.

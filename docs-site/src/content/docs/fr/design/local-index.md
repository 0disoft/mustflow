---
title: Index local
description: Explique comment mustflow utilise SQLite comme index local.
---

mustflow utilise SQLite comme stockage d’index local par défaut.

## Principes

Les fichiers restent toujours la source de vérité.

- `AGENTS.md`
- `.mustflow/config/*.toml`
- `.mustflow/context/*.md`
- `.mustflow/docs/*.md`
- `.mustflow/skills/*/SKILL.md`

SQLite sert d’index local secondaire pour accélérer la recherche et l’analyse. Il doit pouvoir être supprimé et reconstruit sans risque.

La base SQLite locale est un cache reconstruisible. Elle ne doit pas être traitée comme source de vérité, stockage de mémoire, journal d’audit ou stockage de transcriptions.

## Emplacement attendu

```text
.mustflow/cache/mustflow.sqlite
```

`mf init` ne crée pas ce fichier immédiatement. L’index est créé lorsque `mf index` s’exécute.
`mf search` lit ce fichier sans modifier les documents sources. De futures fonctionnalités `mf map` et `mf dashboard` pourraient le réutiliser.

Le modèle par défaut déclare cet état ainsi :

```toml
[capabilities]
local_index = "generated_optional"
```

Cela signifie que l’index est une donnée générée optionnelle, pas un document source.

## Données que l’index peut stocker

- Chemins de documents
- Titres et titres de section
- Métadonnées de frontmatter
- Révisions et hashes de documents
- Empreintes de fichiers indexés
- Courts extraits de contenu
- Métadonnées d’intentions de commande
- Références de skills

La commande actuelle `mf index` utilise le mode `metadata_and_snippets`. Elle stocke au plus 2048 octets d’extrait par document, ne stocke pas les corps complets des documents par défaut, et conserve les noms et descriptions d’intentions de commande comme termes dérivés pour que `mf search` puisse encore retrouver le fichier de configuration pertinent.

La table `indexed_files` stocke des empreintes dérivées pour chaque fichier de workflow indexé et pour les fichiers d’ancres source optionnels : chemin, portée source, taille, heure de modification, hash de contenu, heure d’indexation, mode d’index et version du parser. `mf index --incremental` ne réutilise un fichier SQLite existant que lorsque le schéma, la version du parser, les réglages de portée source et les empreintes de fichiers restent compatibles ; sinon il revient à une reconstruction complète.

La table `indexed_source_candidates` enregistre l’appartenance aux candidats source séparément de `indexed_files.source_scope`. Un même chemin peut donc être à la fois un document de workflow faisant autorité et un candidat source sans être déclaré obsolète à tort. Une clé étrangère exige que chaque candidat conserve son empreinte dans `indexed_files` et empêche de supprimer ou de modifier d’abord le chemin de cette empreinte. Les chemins indexés doivent être des chemins relatifs canoniques dans le projet ; la création de l’index et le contrôle de fraîcheur rejettent les traversées, chemins absolus, formes de lecteur ou UNC Windows et liens symboliques au lieu de lire hors de la racine mustflow.

Les métadonnées de recherche sont aussi écrites dans la table `search_ngrams`. Ces lignes sont de courts fragments de termes dérivés qui aident les recherches multilingues lorsque les espaces ou la tokenisation SQLite sont faibles. Elles pointent vers des documents, skills, routes de skill, intentions de commande et ancres source ; elles ne stockent pas de documents ou de code source complets et ne changent pas l’ordre d’autorité. La génération n-gram utilise des limites strictes : au plus les 64 premiers caractères de chaque token et 512 lignes n-gram par cible indexée.

Avant une recherche, `mf search` compare les hashes stockés avec les fichiers actuels et renvoie une erreur si le cache est obsolète. Les derniers résultats de vérification et l’analyse des exécutions sont réservés à de futures fonctionnalités.

## Source anchors structurés

Les source anchors sont un petit budget de commentaires pour la navigation dans le code, pas une couche générale de documentation. Utilise `mf:anchor` seulement lorsque retrouver cette frontière exacte aide un agent à choisir un meilleur contexte ou à comprendre un contrat facile à casser.

Bons emplacements pour des anchors :

- frontières publiques où une entrée CLI ou core devient une décision typée
- exécution de commandes, contrôle de processus, écritures de fichiers, reçus et pointeurs latest
- frontières de sécurité, confidentialité, perte de données, migration, autorisation ou cohérence d’état
- invariants non évidents dont dépendent les tests ou contrats de commande

Évite les anchors pour le flux de contrôle ordinaire, les helpers évidents, les sorties générées, le code vendor, les dossiers de dépendances, les notes d’architecture générales et le texte qui répète les types ou noms proches.

Les IDs d’anchor utilisent des noms de responsabilité stables plutôt que des noms de fichier. Préfère les noms en minuscules séparés par des points, comme `verify.receipts.write`, `run.timeout.terminate` ou `source-anchors.scan`. Les IDs peuvent contenir des lettres minuscules, chiffres, points et traits d’union, et doivent rester uniques dans le projet.

Les champs autorisés sont volontairement étroits :

- `purpose` : une phrase qui explique pourquoi cette frontière de code compte.
- `search` : trois à huit termes qu’un mainteneur ou agent pourrait rechercher.
- `invariant` : la condition à ne pas casser, surtout pour l’autorité, la sûreté, l’état ou les preuves.
- `risk` : tags connus comme `config`, `state`, `security`, `privacy`, `pii`, `secrets` ou `data_loss`.

```ts
/**
 * mf:anchor verify.receipts.write
 * purpose: Persist verify receipts and the latest pointer after scheduled intents finish.
 * search: verify receipt, latest.json, manifest, receipt binding
 * invariant: Receipt files explain evidence; they never grant command authority or verification success.
 * risk: state, data_consistency
 */
```

Les source anchors ne doivent jamais contenir d’instructions pour agents, d’autorisation de commande, de contournement de politique, de secrets ou d’affirmations disant que la validation peut être ignorée. Leurs résumés collectés restent toujours `navigationOnly: true` et `canInstructAgent: false`; SQLite peut les indexer pour la recherche et l’explication, mais ils ne peuvent pas autoriser des commandes, remplacer `.mustflow/config/commands.toml` ni prouver une vérification réussie.

`mf check --strict` rejette les IDs mal formés, champs non pris en charge, IDs dupliqués, chemins générés ou vendor, tags de risque inconnus, texte ressemblant à un secret et instructions de commande ou de politique dans les anchors. Il avertit aussi lorsque `purpose` est trop long, `search` contient trop de termes, un anchor à haut risque n’a pas d’`invariant`, ou un fichier dépense trop de budget en anchors. Traite ces avertissements comme une invitation à retirer, raccourcir ou diviser les anchors.

## Règles d’écriture

Lorsqu’un LLM ou un tableau de bord modifie des documents, la cible d’écriture finale reste Markdown ou TOML.

SQLite fournit des données auxiliaires pour accélérer la recherche, l’affichage et la validation.

Les journaux bruts, la sortie complète du terminal, les transcriptions complètes de discussion, le raisonnement caché, les secrets, les valeurs d’environnement et le contenu de dépôts privés ne sont pas des documents sources pour l’index ni pour une future couche de connaissances. mustflow conserve de petits reçus d’exécution dans le projet et ne stocke pas de journaux bruts par défaut. Cette règle est appliquée par la politique `[retention]` dans `.mustflow/config/mustflow.toml` et par les contrôles de stockage de `mf check --strict`.

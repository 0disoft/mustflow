---
mustflow_doc: skill.test-maintenance
locale: fr
canonical: false
revision: 2
name: test-maintenance
description: Applique cette skill lors de l'ajout, de la mise a jour, de la suppression ou de l'audit de tests en reponse aux changements de comportement, d'API, de snapshots, de compatibilite ou de corrections de bugs.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.test-maintenance
  command_intents:
    - test
    - test_related
    - test_audit
    - snapshot_update
    - lint
    - build
---

# Maintenance Des Tests

## Objectif

Maintenir les tests alignes avec le contrat de comportement actuel.

## Utiliser Quand

- Un comportement est ajoute, modifie, supprime ou deprecie.
- Un correctif de bug a besoin d'un test de regression.
- Les tests existants peuvent etre obsoletes, dupliques, trop larges ou lies a des details d'implementation supprimes.
- La sortie de snapshot a change.

## Ne Pas Utiliser Quand

- La tache change uniquement de la prose ou des commentaires.
- Le depot n'a pas d'intent de test configure et l'utilisateur a demande de ne pas ajouter de tests.

## Entrees Requises

- Demande utilisateur
- Contrat de comportement actuel
- Chemin de code modifie ou supprime
- Style de test existant
- `.mustflow/config/commands.toml`
- `.mustflow/config/mustflow.toml` `[testing]`

## Preconditions

- La tache correspond aux conditions d'utilisation et ne correspond pas aux exclusions.
- Les entrees requises sont disponibles, ou les entrees manquantes peuvent etre signalees sans supposition.
- Les instructions de priorite superieure et `.mustflow/config/commands.toml` ont ete verifiees pour le perimetre actuel.

## Modifications Autorisees

- Garder les modifications dans le perimetre decrit par cette skill, la demande utilisateur et la route correspondante dans `.mustflow/skills/INDEX.md`.
- Ne pas elargir les permissions de commande, inventer des faits projet ou modifier des fichiers de workflow sans rapport.

## Procedure

1. Definir le comportement actuel attendu.
2. Chercher les tests existants avant d'en introduire de nouveaux.
3. Classer les tests affectes:
   - `active`: valide encore le comportement actuel
   - `update_needed`: le comportement a change
   - `obsolete_candidate`: valide probablement un comportement supprime ou non pertinent
   - `legacy_contract`: l'ancien comportement est preserve volontairement
   - `flaky_or_environmental`: l'echec peut dependre de l'environnement
4. Ajouter, mettre a jour, supprimer ou signaler les tests selon la classification.
5. Ne pas reintroduire un comportement supprime uniquement parce que d'anciens tests l'attendent.
6. Traiter les mises a jour de snapshots comme manuelles, sauf si `snapshot_update` est explicitement approuve et configure.
7. Garder les tests deterministes et proches du contrat de comportement.

## Postconditions

- La sortie attendue peut etre produite avec preuves claires, intentions de commande executees, verifications ignorees et risques restants.
- Toute intention de commande manquante, entree inconnue ou conflit d'autorite est signale au lieu d'etre cache.

## Verification

Utiliser les command intents oneshot configures quand ils sont disponibles:

- `test`
- `test_related`
- `test_audit`
- `snapshot_update` uniquement avec approbation explicite
- `lint`
- `build`

Ne pas deduire des commandes de test manquantes.

## Gestion Des Echecs

- Si les tests echouent, inspecter le premier echec pertinent.
- Ne pas supprimer ni affaiblir des tests uniquement pour faire passer la validation.
- S'il est incertain qu'un test soit obsolete, le signaler au lieu de le supprimer.
- Si la commande de test est indisponible, signaler l'intent manquant.

## Format De Sortie

- Contrat de comportement teste
- Tests ajoutes
- Tests mis a jour
- Tests supprimes, avec raison
- Candidats de tests obsoletes
- Command intents executes
- Command intents omis et raisons
- Risques de test restants

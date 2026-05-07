---
mustflow_doc: skill.code-review
locale: fr
canonical: false
revision: 2
name: code-review
description: Applique cette skill lors de la revue de changements de code, de perimetre, de risques ou de lacunes de verification.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  command_intents:
    - test
    - test_related
    - test_audit
    - lint
---

# Revue De Code

## Objectif

Verifier qu'un changement est aligne avec la demande et garantir qu'aucun risque comportemental ni lacune de verification ne persiste.

## Utiliser Quand

- Les changements de code, les diffs, les pull requests ou des risques potentiels de regression exigent une revue.
- L'objectif principal est l'evaluation du risque plutot que l'implementation d'un nouveau comportement.

## Ne Pas Utiliser Quand

- La tache concerne uniquement des changements de redaction, de traduction ou de formatage.
- Aucun fichier modifie ni diff n'est disponible pour revue.

## Entrees Requises

- Fichiers modifies ou diffs
- Criteres de revue specifies par l'utilisateur
- `AGENTS.md`
- `.mustflow/docs/agent-workflow.md`
- `.mustflow/config/commands.toml`

## Procedure

1. Revoir la liste des fichiers modifies.
2. Identifier les edits non lies ou superflus.
3. Evaluer l'impact sur le comportement, la configuration, les commandes et la documentation.
4. Revoir la pertinence des tests:
   - tests manquants pour de nouvelles fonctionnalites
   - tests obsoletes pour des fonctionnalites supprimees
   - tests redondants qui ne couvrent pas les nouveaux risques
   - assertions affaiblies ou insuffisantes
   - mises a jour de snapshots sans justification claire
   - tests qui reintroduisent par inadvertance un comportement supprime
5. Verifier l'existence des command intents pertinents.
6. Documenter les constats classes par severite.

## Verification

Suivre `.mustflow/docs/agent-workflow.md#command-execution-policy`.

Command intents associes:

- `test`
- `test_related`
- `test_audit`
- `lint`

Evite d'introduire des commandes shell brutes; reference les noms de command intent definis dans `.mustflow/config/commands.toml`.

## Gestion Des Echecs

- Si un command intent est manquant, limite a une execution manuelle, desactive ou inconnu, signale son statut au lieu de deviner.
- Documente toute verification omise ainsi que les risques restants associes.
- Arrete immediatement et signale si des donnees sensibles ou des risques de commande destructive sont identifies.

## Format De Sortie

- Resume
- Constats classes par severite
- Liste des fichiers revus
- Command intents executes
- Command intents omis et justifications
- Notes sur la pertinence des tests
- Risques restants identifies

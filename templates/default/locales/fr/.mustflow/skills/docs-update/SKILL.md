---
mustflow_doc: skill.docs-update
locale: fr
canonical: false
revision: 1
name: docs-update
description: Applique cette skill lors de la mise a jour de la documentation mustflow ou projet.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  command_intents:
    - docs_validate
    - mustflow_check
---

# Mise A Jour De Documentation

## Objectif

Garantir que la documentation reflete avec precision le flux actuel, les commandes et le comportement visible par l'utilisateur.

## Utiliser Quand

- Les fichiers de flux de travail agent sont modifies.
- Les contrats de commandes ou les champs de configuration sont mis a jour.
- Le comportement visible par l'utilisateur a change et demande une mise a jour de documentation.

## Ne Pas Utiliser Quand

- La tache concerne uniquement des details d'implementation prives.
- L'utilisateur demande explicitement de ne pas modifier la documentation.

## Entrees Requises

- Comportement modifie ou champ de configuration change
- Fichier source ou modele pertinent
- Page de documentation actuelle ou fichier Markdown
- `.mustflow/config/commands.toml`

## Procedure

1. Localiser le document responsable de l'explication.
2. Mettre a jour uniquement les sections les plus pertinentes.
3. Garantir que les noms de commandes et les chemins sont exacts.
4. Eviter d'ajouter du langage marketing ou du remplissage de tutoriel.
5. Ne pas modifier manuellement les fichiers generes.

## Verification

Executer `docs_validate` et `mustflow_check` s'ils sont configures et disponibles pour l'usage agent.
Sinon, indiquer la raison de l'omission de ces controles.

## Gestion Des Echecs

- Si la validation de documentation echoue, corriger le premier lien casse ou la premiere erreur de syntaxe pertinente.
- Si un contrat de commande a change, verifier la coherence entre la documentation et `.mustflow/config/commands.toml`.
- Si le statut de traduction n'est pas clair, marquer le document pour revue au lieu de deviner s'il est a jour.

## Format De Sortie

- Documents modifies
- Comportement ou champs documentes
- Command intents executes
- Controles omis et raisons
- Suivis de traduction requis

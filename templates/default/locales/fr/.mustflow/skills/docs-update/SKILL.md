---
mustflow_doc: skill.docs-update
locale: fr
canonical: false
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: docs-update
description: Applique cette skill lors de la mise a jour de la documentation mustflow ou projet.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.docs-update
  command_intents:
    - docs_validate
    - mustflow_check
---

# Mise A Jour De Documentation

<!-- mustflow-section: purpose -->
## Objectif

Garantir que la documentation reflete avec precision le flux actuel, les commandes et le comportement visible par l'utilisateur.

<!-- mustflow-section: use-when -->
## Utiliser Quand

- Les fichiers de flux de travail agent sont modifies.
- Les contrats de commandes ou les champs de configuration sont mis a jour.
- Le comportement visible par l'utilisateur a change et demande une mise a jour de documentation.

<!-- mustflow-section: do-not-use-when -->
## Ne Pas Utiliser Quand

- La tache concerne uniquement des details d'implementation prives.
- L'utilisateur demande explicitement de ne pas modifier la documentation.

<!-- mustflow-section: required-inputs -->
## Entrees Requises

- Comportement modifie ou champ de configuration change
- Fichier source ou modele pertinent
- Page de documentation actuelle ou fichier Markdown
- `.mustflow/config/commands.toml`

<!-- mustflow-section: preconditions -->
## Preconditions

- La tache correspond aux conditions d'utilisation et ne correspond pas aux exclusions.
- Les entrees requises sont disponibles, ou les entrees manquantes peuvent etre signalees sans supposition.
- Les instructions de priorite superieure et `.mustflow/config/commands.toml` ont ete verifiees pour le perimetre actuel.

<!-- mustflow-section: allowed-edits -->
## Modifications Autorisees

- Garder les modifications dans le perimetre decrit par cette skill, la demande utilisateur et la route correspondante dans `.mustflow/skills/INDEX.md`.
- Ne pas elargir les permissions de commande, inventer des faits projet ou modifier des fichiers de workflow sans rapport.

<!-- mustflow-section: procedure -->
## Procedure

1. Localiser le document responsable de l'explication.
2. Mettre a jour uniquement les sections les plus pertinentes.
3. Garantir que les noms de commandes et les chemins sont exacts.
4. Eviter d'ajouter du langage marketing ou du remplissage de tutoriel.
5. Ne pas modifier manuellement les fichiers generes.

<!-- mustflow-section: postconditions -->
## Postconditions

- La sortie attendue peut etre produite avec preuves claires, intentions de commande executees, verifications ignorees et risques restants.
- Toute intention de commande manquante, entree inconnue ou conflit d'autorite est signale au lieu d'etre cache.

<!-- mustflow-section: verification -->
## Verification

Executer `docs_validate` et `mustflow_check` s'ils sont configures et disponibles pour l'usage agent.
Sinon, indiquer la raison de l'omission de ces controles.

<!-- mustflow-section: failure-handling -->
## Gestion Des Echecs

- Si la validation de documentation echoue, corriger le premier lien casse ou la premiere erreur de syntaxe pertinente.
- Si un contrat de commande a change, verifier la coherence entre la documentation et `.mustflow/config/commands.toml`.
- Si le statut de traduction n'est pas clair, marquer le document pour revue au lieu de deviner s'il est a jour.

<!-- mustflow-section: output-format -->
## Format De Sortie

- Documents modifies
- Comportement ou champs documentes
- Command intents executes
- Controles omis et raisons
- Suivis de traduction requis

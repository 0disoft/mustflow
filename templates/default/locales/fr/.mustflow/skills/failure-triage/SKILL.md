---
mustflow_doc: skill.failure-triage
locale: fr
canonical: false
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: failure-triage
description: Applique cette skill quand un command intent configure ou une etape de verification echoue.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.failure-triage
  command_intents:
    - mustflow_check
---

# Diagnostic D'Echec

<!-- mustflow-section: purpose -->
## Objectif

Identifier la cause racine la plus probable d'une commande echouee ou d'une etape de verification avant de modifier des fichiers.

<!-- mustflow-section: use-when -->
## Utiliser Quand

- Un command intent configure renvoie un code de sortie non nul.
- Les controles de validation, build, test ou documentation echouent.
- La cause racine de l'echec n'est pas encore evidente.

<!-- mustflow-section: do-not-use-when -->
## Ne Pas Utiliser Quand

- L'echec est totalement compris et un correctif cible est disponible.
- L'utilisateur a demande uniquement un resume de haut niveau.

<!-- mustflow-section: required-inputs -->
## Entrees Requises

- Command intent original
- Code de sortie
- Sortie tronquee de stdout et stderr
- Fichiers modifies recemment
- Entree pertinente du contrat de commande

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

1. Conserver le nom original de l'intent en echec.
2. Analyser la premiere erreur exploitable.
3. Determiner si l'echec provient du code, des tests, de la configuration, de la documentation ou de l'environnement.
4. Examiner les fichiers les plus pertinents.
5. Formuler une hypothese unique et la verifier avec l'intent configure le plus cible.

<!-- mustflow-section: postconditions -->
## Postconditions

- La sortie attendue peut etre produite avec preuves claires, intentions de commande executees, verifications ignorees et risques restants.
- Toute intention de commande manquante, entree inconnue ou conflit d'autorite est signale au lieu d'etre cache.

<!-- mustflow-section: verification -->
## Verification

Relancer l'intent en echec d'origine quand c'est possible. Si c'est trop large, executer l'intent configure
le plus cible qui isole la meme zone d'echec.

<!-- mustflow-section: failure-handling -->
## Gestion Des Echecs

- Eviter de regrouper des correctifs non lies.
- Si l'echec est du a des outils manquants, signaler l'outil manquant et la commande qui a revele le probleme.
- Si des donnees sensibles apparaissent dans la sortie, arreter de copier la sortie brute et resumer les informations de maniere sure.

<!-- mustflow-section: output-format -->
## Format De Sortie

- Intent en echec
- Cause racine probable
- Preuves
- Correctif applique ou recommande
- Verification executee
- Risque restant

---
mustflow_doc: skill.failure-triage
locale: fr
canonical: false
revision: 1
name: failure-triage
description: Applique cette skill quand un command intent configure ou une etape de verification echoue.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  command_intents:
    - mustflow_check
---

# Diagnostic D'Echec

## Objectif

Identifier la cause racine la plus probable d'une commande echouee ou d'une etape de verification avant de modifier des fichiers.

## Utiliser Quand

- Un command intent configure renvoie un code de sortie non nul.
- Les controles de validation, build, test ou documentation echouent.
- La cause racine de l'echec n'est pas encore evidente.

## Ne Pas Utiliser Quand

- L'echec est totalement compris et un correctif cible est disponible.
- L'utilisateur a demande uniquement un resume de haut niveau.

## Entrees Requises

- Command intent original
- Code de sortie
- Sortie tronquee de stdout et stderr
- Fichiers modifies recemment
- Entree pertinente du contrat de commande

## Procedure

1. Conserver le nom original de l'intent en echec.
2. Analyser la premiere erreur exploitable.
3. Determiner si l'echec provient du code, des tests, de la configuration, de la documentation ou de l'environnement.
4. Examiner les fichiers les plus pertinents.
5. Formuler une hypothese unique et la verifier avec l'intent configure le plus cible.

## Verification

Relancer l'intent en echec d'origine quand c'est possible. Si c'est trop large, executer l'intent configure
le plus cible qui isole la meme zone d'echec.

## Gestion Des Echecs

- Eviter de regrouper des correctifs non lies.
- Si l'echec est du a des outils manquants, signaler l'outil manquant et la commande qui a revele le probleme.
- Si des donnees sensibles apparaissent dans la sortie, arreter de copier la sortie brute et resumer les informations de maniere sure.

## Format De Sortie

- Intent en echec
- Cause racine probable
- Preuves
- Correctif applique ou recommande
- Verification executee
- Risque restant

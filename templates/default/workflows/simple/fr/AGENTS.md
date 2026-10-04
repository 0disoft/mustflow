---
mustflow_doc: agents.root
locale: fr
canonical: false
revision: 1
lifecycle: user-editable
authority: binding
---

# AGENTS.md

Ce dépôt utilise le flux simple de mustflow.

## Priorité

Suis d'abord la tâche de l'utilisateur et les règles du projet le plus proche. Elles passent avant ce fichier.

## Lecture

Ne lis que l'`AGENTS.md` le plus proche, plus le code et la configuration de paquets touchés par la tâche. Les index de skills étendus et la doc du flux sont facultatifs ; ignore-les sauf si la tâche en a besoin.

## Commandes

Utilise directement les scripts du paquet, le Makefile, le Taskfile ou les commandes Go et Rust du dépôt. `mf run check`, `test`, `typecheck`, `lint` et `build` sont facultatifs et découvrent les commandes courantes dans les scripts du paquet et les manifestes Go et Rust. Les restrictions de commandes écrites dans le dépôt s'appliquent toujours et `mf run` les respecte.

## Périmètre

Le développement courant n'a pas besoin d'enregistrer des intents ni de synchroniser les manifestes. Choisis des vérifications ciblées et pertinentes, et réutilise les résultats valides quand l'entrée n'a pas changé. Un échec, une commande absente ou une vérification jamais lancée ne vaut pas validation. Ne lance les vérifications complètes de release que pour de vrais changements de release, d'API publique, de sécurité ou de données dans le périmètre courant.

## Modifications et Git

Laisse intacts les changements sans rapport. Garde les secrets hors des logs et du dépôt. Prépare un périmètre exact et fais de petits commits logiques. Push, publication et déploiement uniquement avec l'accord de l'utilisateur.

## Hygiène

Évite les montées de version automatiques et les cycles répétés de permissions ou de lecture. Les scripts qui lancent des processus en arrière-plan doivent nettoyer leurs propres processus. La doc globale strict existante ne régit pas les flux simple ordinaires.

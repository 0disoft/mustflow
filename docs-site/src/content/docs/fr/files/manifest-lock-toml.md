---
title: .mustflow/config/manifest.lock.toml
description: Fichier généré d’état d’installation écrit par mf init.
---

`.mustflow/config/manifest.lock.toml` est généré ou mis à jour après un `mf init` réussi.

Il n’est pas copié depuis le modèle. Il enregistre quels fichiers ont été créés, fusionnés, laissés inchangés ou écrasés dans le dépôt cible.

## Quand il est écrit

- Écrit après un `mf init` réussi.
- Écrit lorsque `--merge` insère un bloc géré dans un `AGENTS.md` existant.
- Écrit lorsque `--force` sauvegarde les fichiers en conflit et les écrase.
- Non écrit lorsque l’installation s’interrompt sur des conflits.
- Non écrit lorsque `--dry-run` imprime seulement le plan d’installation.

## Rôle

- Enregistre l’identifiant et la version du modèle utilisés pour l’installation.
- Enregistre le hash de ligne de base de chaque fichier installé.
- Enregistre l’action effectuée pour chaque fichier.
- Donne aux commandes comme `mf check`, `mf status` et `mf update --dry-run` une ligne de base stable de l’état d’installation.

## Structure

```toml
schema_version = "1"
generated_by = "mustflow"

[template]
id = "default"
version = "0.1.0"
profile = "minimal"
locale = "ko"

[files."AGENTS.md"]
source = "template_locale"
last_action = "created"
content_hash = "sha256:..."
```

## Champs

- `schema_version`: version du schéma du fichier de verrouillage.
- `generated_by`: outil qui a généré le fichier.
- `template.id`: identifiant du modèle utilisé pendant l’installation.
- `template.version`: version du modèle utilisée pendant l’installation.
- `template.profile`: profil de projet sélectionné pendant l’installation.
- `template.locale`: locale des documents mustflow sélectionnée pendant l’installation.
- `template.agent_lang`: langue des rapports d’agent lorsqu’elle est sélectionnée.
- `product_i18n`: section optionnelle écrite lorsque les locales du texte produit sont sélectionnées.
- `files."<path>"`: enregistrement d’installation par fichier.
- `source`: origine du contenu du fichier. Utilise `template_locale`, `template_common` ou `managed_block`.
- `last_action`: action appliquée lors de la dernière installation. Une des valeurs `created`, `unchanged`, `merged`, `overwritten` ou `customized`.
- `content_hash`: hash SHA-256 de ligne de base du contenu que mustflow a enregistré comme installé ou mis à jour de manière sûre.

## Ligne de base des hashes

Actuellement, `content_hash` est la ligne de base au moment de l’installation.
Ce n’est pas un hash vivant du fichier actuel.

`mf check`, `mf status` et `mf update --dry-run` calculent le hash actuel du fichier à l’exécution et le comparent à cette ligne de base. Les hashes de modèle ne sont pas non plus stockés dans le fichier de verrouillage; ils sont calculés depuis le modèle groupé avec le paquet mustflow installé.

Cela garde le fichier de verrouillage comme ligne de base d’installation plutôt que comme instantané vivant de l’état actuel.

Si mustflow met plus tard à jour uniquement un bloc géré à l’intérieur d’un fichier, le schéma du verrou doit d’abord ajouter une ligne de base au niveau du bloc. Le `content_hash` de fichier complet en v1 ne suffit pas à prouver que le bloc géré lui-même est inchangé.

## Règles de modification

Ce fichier n’est pas un document source rédigé à la main.

Régénérez-le avec `mf init` ou une future commande de mise à jour dédiée lorsque l’état d’installation doit être actualisé. Les modifications manuelles peuvent rendre les hashes enregistrés incohérents avec le contenu réel des fichiers.

`mf update --dry-run` utilise `content_hash` comme ligne de base au moment de l’installation. Si le hash actuel du fichier diffère de cette ligne de base, le fichier est traité comme un changement local et la mise à jour automatique est bloquée.

Pour le raisonnement, consultez [Décision sur la structure de manifest.lock.toml](/design/manifest-lock-decision/).

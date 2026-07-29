---
title: mf crash-evidence
description: Valide, normalise et rejoue de façon déterministe des preuves bornées de plantage natif.
---

`mf crash-evidence` sépare la validation d’un enregistrement, la normalisation hors ligne d’un artefact et la relecture d’un ordonnancement modélisé.

## Valider

```sh
npx mf crash-evidence validate crash/evidence.json --json
```

Le fichier doit rester dans la racine mustflow et ne pas dépasser 4 Mio. Le code `0` couvre les enregistrements valides `ready` et `incomplete`; vérifiez donc toujours `readiness`. Une entrée rejetée ou illisible renvoie `1`.

## Collecter

```sh
npx mf crash-evidence collect crash/crash.dmp --adapter windows-minidump --binary bin/app.exe --output crash/evidence.json --json
```

Les adaptateurs sont `windows-minidump`, `linux-core` et `sanitizer`. La collecte n’exécute aucun débogueur, ne charge aucun symbole et n’invente ni registres ni trames absents. `--binary` enregistre le SHA-256 du fichier candidat comme `candidate_only`, sans prouver qu’il correspond au module capturé. `--overwrite` est requis pour remplacer une sortie existante.

Les chemins absolus des modules et des sources sont retirés de l’enregistrement portable. L’adaptateur reconnaît les formes courantes ASan, TSan, MSan, LSan et `runtime error:` d’UBSan avec une limite stricte de trames.

## Rejouer une course

```sh
npx mf crash-evidence race crash/race-scenario.json --json
```

Le scénario fixe acteurs, opérations, ordre, échec optionnel et réutilisation d’adresse. Le rapport ne prouve que la séquence modélisée, pas l’ordre mémoire natif ni le timing de production.

# Modules communs des applis EPS (« cœur commun », étape 1)

Les fichiers communs (code du cours, mode d'emploi, mises à jour, sauvegardes protégées, rappel de sauvegarde, avatars, pouls…) ont **un seul original**, ici dans `atelier/`. Chaque appli garde **sa propre copie** : elle reste autonome et portable seule (par activité), et une erreur dans une appli ne touche pas les autres.

**Ne jamais modifier une copie dans une appli.** Modifier l'original ici, puis, depuis le dossier qui contient tous les clones :

```
python3 mon-EPS/atelier/synchroniser.py              # vérifier (rien n'est modifié)
python3 mon-EPS/atelier/synchroniser.py --appliquer  # recopier + augmenter les versions des sw.js
```

Ensuite : tester les applis modifiées, puis un commit par dépôt. La liste des applis et des modules est en tête du script.

| Original | Rôle | Applis |
|---|---|---|
| `applis-eleves/eps-code.js` | Code du cours, QR du jour | élèves + profs |
| `applis-eleves/eps-avatars.js` | Avatars des messages | élèves + profs |
| `applis-eleves/eps-rappel.js` | Rappels élèves | élèves |
| `applis-eleves/eps-pouls.js` | Prise de pouls assistée | demi-fond, step |
| `applis-eleves/eps-sifflet.js` | Coup de sifflet + vibration des chronos (1 coup départ / mi-course / reprise, 3 coups fin), question oui/non au premier chrono | demi-fond, step, cross training, musculation, badminton, tennis de table |
| `ecran-de-cours/commun/eps-aide.js` | Mode d'emploi, lecture facilitée, partager l'appli | élèves + profs |
| `ecran-de-cours/commun/eps-maj.js` | Bandeau « Nouvelle version » | élèves + profs |
| `ecran-de-cours/commun/eps-coffre.js` | Sauvegardes protégées par mot de passe | profs |
| `ecran-de-cours/commun/eps-garde.js` | Rappel de sauvegarde (bandeau rouge) | profs |
| `ecran-de-cours/commun/eps-demo.js` | Barre violette « 🎭 DÉMO · rien n'est enregistré · Quitter » (remplace le bandeau jaune) | applis avec mode démo, CCF demi-fond |

Musculation (élève et prof) reçoit les mêmes modules communs que les autres applis (sauf les avatars, non utilisés) depuis le 20/11/2026.

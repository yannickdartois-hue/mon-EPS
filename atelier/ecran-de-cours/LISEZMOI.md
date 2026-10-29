# Écran de cours : la source commune des 6 cycles

Les écrans de cours (badminton, tennis de table, demi-fond, volley-ball, step, danse) sont fabriqués à partir de ce dossier. Une correction faite ici vaut pour les 6 cycles.

## Ce qu'il y a ici

| Fichier | Rôle |
|---|---|
| `ecran.js` | Le moteur : déroulé, minuteur, ajustements, séances, outils, séance du jour. Commun aux 5. |
| `ecran.css` | La présentation commune. |
| `gabarit.html` | La page, avec des cases `{{…}}` remplies pour chaque activité. |
| `apps/activites.json` | Nom, couleur, fichier de données et outil complet de chaque activité. |
| `apps/<activité>.js` | Ce qui est propre à l'activité : niveaux, séance du jour, liste des outils, raccourcis, schémas. |
| `apps/<activité>.css` | Couleurs de l'activité et de ses niveaux, dessin des schémas. |
| `commun/` | `eps-design.css`, `eps-outil.css`, `eps-commun.js`, `eps-aide.js` (bouton « ? », police lisible) et `aide-ecran.js` (le mode d’emploi de l’écran), recopiés tels quels. |
| `construire.py` | Fabrique et recopie le tout dans les 5 dépôts. |
| `commun/eps-charte-v1.css` | Charte visuelle commune v1 (thème clair, couleurs de base). La couleur de chaque activité (`couleur`) et la teinte de chaque cycle (`teintes` : clair / normal / foncé) sont dans `apps/activites.json` ; `construire.py` en déduit le petit style « Charte v1 » de chaque page. Une v2 sera un autre fichier. |

## Modifier un écran

1. Modifier ici, jamais directement dans un dépôt (la page fabriquée le rappelle en tête).
2. `python3 construire.py` : réécrit `index.html`, `ecran.js`, `ecran.css` et les fichiers communs de chaque dépôt, ajoute les fichiers à la liste hors ligne et augmente le numéro de cache de `sw.js` pour que l'iPad recharge.
3. `python3 construire.py --verifier` : ne change rien, signale un dépôt modifié à la main depuis.
4. Tester, puis publier chaque dépôt.

Les dépôts doivent être à côté de `mon-eps` (même dossier parent).

## Ce qui n'est pas fabriqué ici

Les données des séances (`*-donnees.js`) et les outils complets (`*-old.html`) restent dans leur dépôt.

/* aide-ecran.js — mode d'emploi de l'écran de cours (commun aux cycles, lu par eps-aide.js).
   Fichier COMMUN : le modifier dans mon-eps/atelier/ecran-de-cours/commun/, puis construire.py. */
window.EPS_AIDE={appli:document.title+' · écran de cours',bouton:false,
pied:'Les réglages et les notes restent sur cet appareil. Rien n’est envoyé.',
publics:[{id:'prof',titre:'Professeur',chapitres:[
{t:'Avant le cours (2 min)',html:`<ol>
<li>L’écran s’ouvre sur la <b>séance du jour</b>. Pour en changer : <span class="bouton">‹ Séances</span> en bas, puis touchez la séance. La bande des numéros, sous l’en-tête, fait la même chose.</li>
<li>Regardez le <b>déroulé</b> (la barre colorée) : un segment par bloc, sa largeur suit sa durée. Touchez un segment pour lire le bloc à l’avance.</li>
<li>Ouvrez l’appli une fois avec du réseau : ensuite elle marche sans réseau, au gymnase comme sur la piste. Sur iPad : Safari → Partager → « Sur l’écran d’accueil ».</li></ol>
<p class="astuce">La séance du jour est la même que dans <b>Préparer</b> (l’outil complet) : changer l’une change l’autre.</p>`},
{t:'Pendant la séance : le minuteur',html:`<ul>
<li><span class="bouton">Démarrer la séance</span> au coup de sifflet. Chaque bloc a son minuteur ; un double bip signale la fin, sans couper le bloc.</li>
<li><span class="bouton">+ 2 min</span> <span class="bouton">+ 5 min</span> rallongent le bloc en cours ; <span class="bouton">Pause</span> l’arrête (blessure, rangement) ; <span class="bouton">Bloc suivant</span> passe à la suite.</li>
<li>En bas, l’heure de <b>fin prévue</b> se recalcule : retard ou avance s’affichent en minutes.</li>
<li><b>Zapper</b> retire un bloc ; touchez à nouveau pour le remettre. Glissez le doigt à gauche ou à droite pour feuilleter les blocs en aperçu, <span class="bouton">Revenir au bloc en cours</span> pour revenir.</li>
<li>L’écran reste allumé pendant la séance. Si la tablette se met en veille ou si la page se recharge, le minuteur reprend où il en était : il se base sur l’heure réelle.</li></ul>`},
{t:'Ajuster le déroulé',html:`<ul>
<li><span class="bouton">Ajuster le déroulé</span> : changez la durée d’un bloc (− / +), montez-le ou descendez-le, <b>remplacez</b>-le, zappez-le, ou <b>ajoutez un exercice d’une autre séance</b>. « Revenir au déroulé d’origine » annule tout.</li>
<li>En retard, l’écran propose une solution : retirer des minutes au bloc le plus long, le zapper, ou raccourcir le bilan.</li>
<li>Un exercice zappé peut être <b>reporté</b> à la séance suivante : il y sera proposé (« Ajouter » ou « Non »).</li></ul>`},
{t:'Outils et raccourcis',html:`<ul>
<li><span class="bouton">Outils</span> : tournoi, échauffements, banque de situations, évaluation… L’outil s’ouvre par-dessus le cours ; le minuteur continue (temps restant en haut). <span class="bouton">‹ Retour au cours</span> pour revenir.</li>
<li>Les boutons jaunes dans un bloc ouvrent directement l’outil dont il a besoin (par exemple « Ouvrir le tournoi »).</li>
<li><span class="bouton">Préparer</span> (en haut) ouvre l’outil complet : toutes les fiches, l’impression, l’évaluation, les notes.</li></ul>`},
{t:'Fin de séance',html:`<ul>
<li>Après le dernier bloc, l’écran fait le <b>bilan</b> : blocs rallongés, raccourcis, zappés, et durée réelle de pratique.</li>
<li>Cochez les exercices zappés à reporter, écrivez une phrase à retenir, puis <span class="bouton">Enregistrer</span>.</li>
<li><span class="bouton">Faire de … la séance du jour</span> prépare le cours suivant. <span class="bouton">Reprendre la séance</span> si vous avez terminé trop tôt.</li></ul>`},
{t:'Lecture facilitée, projection',html:`<ul>
<li><b>Lecture facilitée</b> (case en haut de ce mode d’emploi) : police Atkinson Hyperlegible et lettres plus espacées, utile en cas de dyslexie, ou pour un écran projeté vu de loin. Le choix vaut pour toutes les applis EPS de l’appareil.</li>
<li>Projeté ou sur un grand écran, les textes restent à 15 px minimum ; à l’impression, les tailles d’origine reviennent.</li></ul>`}]}]};

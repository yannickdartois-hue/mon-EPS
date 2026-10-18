/* Écran de cours — demi-fond : ce qui est propre à l'activité.
   Source : mon-eps/atelier/ecran-de-cours/apps/. Le moteur commun est ecran.js. */
const APP={
  old:'cycle-demi-fond-old.html',
  cle:'dq',
  niv:{s:{label:'Seconde',court:'2de',long:'SECONDE',L:SESSIONS},t:{label:'Terminale',court:'Tle',long:'TERMINALE',L:T_SESSIONS}},
  defaut:'s',
  lienOld:(c,id)=>APP.old+'#'+c+'-'+id,
  lireCur:()=>lire('df2-cur2',{})||{},
  marquerJour(c,id){const cur=Object.assign({s:'',t:''},lire('df2-cur2',{}));cur[c]=id;ecrire('df2-cur2',cur);Object.assign(CUR,cur)},
  outils:[{"titre": "Pendant le cours", "items": [["calc", "Ma calculette", "une VMA → toutes les cibles"], ["tables", "Tableaux d’allures", "VMA 8 à 20 · à imprimer"], ["warm", "Échauffement autonome", "fiche · 4 niveaux · grille"], ["piste", "Piste et plots", "1 plot = 1 km/h · départs"]]}, {"titre": "Adapter", "items": [["bank", "Banque de situations", "16 situations · N1–N4"], ["diff", "Travail par niveaux", "groupes G1–G4 · inaptes"], ["roles", "Coach, chrono, juge", "AFL3 · fiche élève"], ["coach", "Repères d’entraîneur", "intensités · récup · sécurité"]]}, {"titre": "Évaluer", "items": [["evalf", "Évaluation", "barème · calcul de la note"], ["check", "Lien avec l’éval", "référentiel Pompidou"]]}],
  urlOutil:id=>APP.old+'#'+J.c+'-'+id,
  racc:[[/^warm$/,'warm','Échauffement autonome'],[/outil « évaluation »|barème|course [123]\b|épreuve blanche/i,'evalf','Barème et note'],[/tableau d’allures|tableaux d’allures/i,'tables','Tableaux d’allures'],[/vma|plot cible|au plot|allure/i,'calc','Calculette VMA']],
  schemaDe:e=>{if(!e||!e.sch||!SCH[e.sch])return '';const sp=SCH[e.sch];return `<div class="schema">${piste(sp)}</div><div class="legende-o">${LEGEND}</div>${sp.cap?`<p class="cap">${sp.cap}</p>`:''}`}
};

/* Écran de cours — badminton : ce qui est propre à l'activité.
   Source : mon-eps/atelier/ecran-de-cours/apps/. Le moteur commun est ecran.js. */
const APP={
  old:'cycle-badminton-old.html',
  cle:'bd',
  niv:{p:{label:'Seconde',court:'2de',long:'SECONDE',L:P_SESSIONS},t:{label:'Terminale',court:'Tle',long:'TERMINALE',L:T_SESSIONS},a:{label:'Autonomie',court:'Auto',long:'AUTONOMIE',L:A_SESSIONS}},
  defaut:'t',
  lienOld:(c,id)=>c==='a'?APP.old+'#a-t-'+id:APP.old+'#g-'+c+'-'+id,
  /* séance du jour : même réglage que l'outil complet ; « prefs » daté pour la synchro */
  lireCur:()=>lire('bad-cur',{})||{},
  marquerJour(c,id){const cur=Object.assign({p:'',t:'',a:''},lire('bad-cur',{}));cur[c]=id;ecrire('bad-cur',cur);Object.assign(CUR,cur);
    const L=lire('bad-tournois',{})||{};L.prefs={id:'prefs',kind:'prefs',cur:Object.assign({},cur),updated:Date.now()};ecrire('bad-tournois',L)},
  outils:[{"titre": "Pendant le cours", "items": [["rot", "Tournois", "montante-descendante · ronde suisse"], ["atp", "Défi ATP", "classement à points"], ["warm", "Échauffements", "7 situations"], ["equipe", "Échauffement d’équipe", "S3–S7 · fiche à imprimer"]]}, {"titre": "Adapter", "items": [["beg", "Débutants", "situations collège"], ["bank", "Banque d’exercices", "6 catégories · N1–N4"], ["diff", "Travail par niveaux", "tests d’orientation"], ["coach", "Repères de spécialiste", "règles · FFBaD · sécurité"]]}, {"titre": "Évaluer", "items": [["evalf", "Fiche d’évaluation", "S9 · grille et notes"], ["check", "Lien avec l’éval", "référentiel Pompidou"]]}, {"titre": "Travail en autonomie (GAREEPS)", "a": 1, "items": [["suivi", "Suivi de classe", "thèmes · niveaux · terrains"], ["catalogue", "Catalogue", "13 thèmes · 29 exercices"], ["auto", "Auto-évaluation", "grille L1 · étoile"], ["carnet", "Carnet d’entraînement", "fiche élève à imprimer"], ["demarche", "La démarche", "GAREEPS · organisation"]]}],
  urlOutil:(id,auto)=>{const c=J.c==='a'?'t':J.c;return APP.old+'#'+(auto?'a':'g')+'-'+c+'-'+id},
  racc:[[/^warm$/,'warm','Fiches d’échauffement'],[/bouton tournoi|onglet tournois|montante-descendante|rencontres? en relais|rencontre blanche/i,'rot','Ouvrir le tournoi'],[/défi atp/i,'atp','Ouvrir le Défi ATP'],[/onglet suivi/i,'suivi','Suivi de classe',1],[/catalogue/i,'catalogue','Catalogue',1],[/auto-évaluation|grille d’observation/i,'auto','Grille et étoile',1]],
  schemaDe:e=>{if(!e||!e.sch||!SCH[e.sch])return '';const sp=SCH[e.sch];return `<div class="schema">${sp.salle?salle(sp):tt(sp)}</div><div class="legende-o">${LEGEND}</div>${sp.cap?`<p class="cap">${sp.cap}</p>`:''}`}
};

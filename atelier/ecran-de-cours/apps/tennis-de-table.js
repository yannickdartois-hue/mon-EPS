/* Écran de cours — tennis de table : ce qui est propre à l'activité.
   Source : mon-eps/atelier/ecran-de-cours/apps/. Le moteur commun est ecran.js. */
let CUR_A='t';   /* leçons en autonomie : Terminale (at) ou Première (ap) */
const APP={
  old:'outils.html',
  cle:'tq',
  niv:{p:{label:'Première',court:'1re',long:'PREMIÈRE',L:P_SESSIONS},t:{label:'Terminale',court:'Tle',long:'TERMINALE',L:T_SESSIONS},a:{label:'Autonomie',court:'Auto',long:'AUTONOMIE',L:A_SESSIONS}},
  defaut:'t',
  lienOld:(c,id)=>c==='a'?APP.old+'#a-'+CUR_A+'-'+id:APP.old+'#g-'+c+'-'+id,
  lireCur(){const o=lire('tt-cur',{})||{},c=o.cur||{};CUR_A=c.ap&&!c.at?'p':'t';return Object.assign({},c,{a:c.at||c.ap||''})},
  marquerJour(c,id){const o=lire('tt-cur',{})||{},cur=Object.assign({t:'',p:'',at:'',ap:''},o.cur||{});cur[c==='a'?'a'+CUR_A:c]=id;const up=Date.now();
    ecrire('tt-cur',{cur,updated:up});if(c==='a')CUR.a=id;else CUR[c]=id;
    const L=lire('tt-tournois',{})||{};L.prefs={id:'prefs',kind:'prefs',type:'prefs',cur:Object.assign({},cur),updated:up};ecrire('tt-tournois',L)},
  outils:[{"titre": "Pendant le cours", "items": [["rot", "Tournois", "montante-descendante · ronde suisse"], ["atp", "Défi ATP", "classement à points"], ["warm", "Échauffements", "7 situations"], ["equipe", "Échauffement d’équipe", "S3–S7 · fiche à imprimer"]]}, {"titre": "Adapter", "items": [["beg", "Débutants", "situations collège"], ["bank", "Banque d’exercices", "6 catégories · N1–N4"], ["diff", "Travail par niveaux", "tests d’orientation"], ["coach", "Repères de spécialiste", "règles · FFTT · sécurité"]]}, {"titre": "Évaluer", "items": [["obs", "Plan d’observation", "AFL2 · AFL3 · qui, quand"], ["evalf", "Fiche d’évaluation", "S9 · grille et notes"], ["check", "Lien avec l’éval", "référentiel Pompidou"]]}, {"titre": "Travail en autonomie (GAREEPS)", "a": 1, "items": [["suivi", "Suivi de classe", "thèmes · niveaux · tables"], ["catalogue", "Catalogue", "14 thèmes · 34 exercices"], ["auto", "Auto-évaluation", "grille L1 · étoile"], ["carnet", "Carnet d’entraînement", "fiche élève à imprimer"], ["demarche", "La démarche", "GAREEPS · organisation"]]}],
  urlOutil:(id,auto)=>{const c=J.c==='a'?CUR_A:J.c;return APP.old+'#'+(auto?'a':'g')+'-'+c+'-'+id},
  racc:[[/^warm$/,'warm','Fiches d’échauffement'],[/bouton tournoi|onglet tournois|montante-descendante|rencontres? en relais|rencontre blanche/i,'rot','Ouvrir le tournoi'],[/défi atp/i,'atp','Ouvrir le Défi ATP'],[/onglet suivi/i,'suivi','Suivi de classe',1],[/catalogue/i,'catalogue','Catalogue',1],[/auto-évaluation|grille d’observation/i,'auto','Grille et étoile',1]],
  schemaDe:e=>{if(!e||!e.sch||!SCH[e.sch])return '';const sp=SCH[e.sch];return `<div class="schema">${sp.salle?salle(sp):tt(sp)}</div><div class="legende-o">${LEGEND}</div>${sp.cap?`<p class="cap">${sp.cap}</p>`:''}`}
};

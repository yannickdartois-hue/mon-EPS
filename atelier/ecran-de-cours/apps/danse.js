/* Écran de cours — danse : ce qui est propre à l'activité.
   Source : mon-eps/atelier/ecran-de-cours/apps/. Le moteur commun est ecran.js. */
/* Le cycle de danse tient en un niveau (Seconde). Chaque séance garde son déroulé (tl) et ses fiches. */
const courtD=t=>String(t||'').split(/\s:\s|\s·\s/)[0];
const convD=f=>({t:f.titre,k:f.cat,disp:f.dispo,four:f.roles,deroul:f.deroul||[],cons:f.crit?[f.crit]:[],reus:f.reussite,moins:f.moins,plus:f.plus,spec:f.schema});
const PASSAGE_TXT={ensemble:'Plusieurs groupes ensemble',jumeles:'Groupes jumelés',classe:'Seul devant la classe'};
const DANSE=SEANCES.map(S=>({id:S.id.toLowerCase(),n:S.id,title:S.titre,short:courtD(S.titre),obj:S.obj,passage:S.passage,tirage:S.tirage,porters:S.porters||[],
  prepare:S.prepare||[],install:S.install,bilan:S.bilan,
  tl:S.tl.map(t=>[t[0],String(t[1]),t[2]]),ex:S.fiches.map(convD),evalPage:false,status:/^Évaluation/.test(S.titre)?'eval':''}));
const APP={
  old:'outils.html',
  cle:'da',
  niv:{s:{label:'Seconde',court:'2de',long:'SECONDE',L:DANSE}},
  defaut:'s',
  lienOld:()=>APP.old,
  lireCur(){const j=lire('danse2de_jour',-1);return {s:j>=0&&DANSE[j]?DANSE[j].id:''}},
  marquerJour(c,id){const j=DANSE.findIndex(s=>s.id===id);if(j<0)return;ecrire('danse2de_jour',j);CUR.s=id},
  outils:[{"titre":"Pendant le cours","items":[["tirage","Tirage au sort","thème et contraintes"],["porters","Porters","répertoire, sécurité"],["figdyn","Figures dynamiques","code A à D, critères"],["procedes","Procédés","frises et définitions"],["passages","Passages","organiser le public"]]},
          {"titre":"Adapter","items":[["leviers","Focales","émotion, rire, spectaculaire, danger"],["banque","Banque","situations de rechange"],["diff","Différenciation","peur, aisance, dispense"],["echauff","Échauffements","guidé et autonome"],["securite","Sécurité","règles, prises, rôles"]]},
          {"titre":"Évaluer","items":[["eval","Évaluation","grille /20"],["notation","Notes","saisie et export CSV"],["sources","Repères et sources","pour préparer"]]}],
  urlOutil:id=>APP.old+'#tab-'+id,
  racc:[[/tir(er|age)/i,'tirage','Tirage au sort'],[/\bATR\b|renversement|redressement/i,'figdyn','Figures dynamiques'],[/\bP\d{1,2}\b|porter/i,'porters','Répertoire des porters'],[/unisson|miroir|cascade|canon|question-réponse|accumulation|lâcher/i,'procedes','Frises des procédés'],[/focale|émotion|danger|spectaculaire/i,'leviers','Les focales'],[/échauffement autonome|fiche d’échauffement/i,'echauff','Fiche d’échauffement'],[/spectateur|grille|jumeau|jumelés/i,'passages','Fiche spectateur']],
  schemaDe:e=>{if(!e||!e.spec)return '';return schema(e.spec)},
  /* l'installation : un bloc d'information, sans fiche */
  plan(c,id){
    const s=sea(c,id);if(!s)return [];
    let fi=0;
    return s.tl.map(t=>{const typ=t[2],dur=+t[1];
      if(typ==='acc'||typ==='inst')return {k:'info',typ,label:t[0],court:'Install.',dur};
      const e=s.ex[fi],lab=e?courtD(e.t):t[0];
      return {k:'ex',typ,ref:{c,id,i:fi++},label:lab,dur}})
     .map(x=>(x.orig=x.dur,x.st='todo',x));
  },
  blocInfo(b,s,i){
    const por=s.porters.length?`<h2 class="rub">Porters du jour</h2><p class="texte">${s.porters.map(id=>{const p=porterById(id);return p?`${id} ${esc(p.nom)}`:id}).join(' · ')}</p>`:'';
    return `${s.install?`<h2 class="rub">Installation et sécurité</h2>${orgHTML(s.install)}`:''}${i===0?`<h2 class="rub">Objectif de la séance</h2><p class="texte">${esc(s.obj)}</p>${por}`:''}${s.tirage&&i===0?`<h2 class="rub">Tirage au sort</h2><p class="texte">Étape ${esc(s.tirage)} : onglet Outils › Tirage au sort.</p>`:''}${s.prepare.length&&i===0?`<h2 class="rub">Ce que la séance prépare pour l’évaluation</h2><ul class="org">${s.prepare.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}`},
  bascule:s=>s&&s.passage?`<span class="passage">${esc(PASSAGE_TXT[s.passage]||'')}</span>`:''
};

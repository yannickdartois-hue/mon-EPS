/* Écran de cours — musculation (CA5, Terminale) : ce qui est propre à l'activité.
   Source : mon-eps/atelier/ecran-de-cours/apps/. Le moteur commun est ecran.js.
   Données : muscu-donnees.js (même fichier dans l'appli élève musculation-eleves). */
/* Un seul niveau (Terminale). Chaque séance garde son déroulé (tl) et ses fiches, comme en gymnastique. */
const courtM=t=>String(t||'').split(/\s:\s|\s·\s/)[0];
const convM=f=>({t:f.titre,k:f.cat,disp:f.dispo,four:f.roles,deroul:f.deroul||[],cons:f.crit?[f.crit]:[],reus:f.reussite,moins:f.moins,plus:f.plus,spec:f.schema});
const MUSC=SEANCES.map(S=>({id:S.id.toLowerCase(),n:S.id,title:S.titre,short:courtM(S.titre),obj:S.obj,prepare:S.prepare||[],install:S.install,bilan:S.bilan,
  tl:S.tl.map(t=>[t[0],String(t[1]),t[2]]),ex:S.fiches.map(convM),evalPage:false,status:/Évaluation AFL1/.test(S.titre)?'eval':''}));
const APP={
  old:'outils.html',
  cle:'mu',
  niv:{t:{label:'Terminale',court:'Tle',long:'TERMINALE',L:MUSC}},
  defaut:'t',
  lienOld:()=>APP.old,
  lireCur(){const j=lire('muTle_jour',-1);return {t:j>=0&&MUSC[j]?MUSC[j].id:''}},
  marquerJour(c,id){const j=MUSC.findIndex(s=>s.id===id);if(j<0)return;ecrire('muTle_jour',j);CUR.t=id},
  outils:[{"titre":"Pendant le cours","items":[["nuage","Nuage de mots","mots des élèves, échelle commune"],["defi","Défi 10 RM","équipes : kilos + qualité"],["calculette","Calculette","charges de 30 à 80 %"]]},
          {"titre":"Repères","items":[["mobiles","Les 3 mobiles","%, séries, rép., ressentis"],["ateliers","Ateliers","consignes, sécurité, matériel"],["securite","Sécurité","règles, angles, respiration"]]},
          {"titre":"Préparer et évaluer","items":[["seances","Les 9 séances","détaillées, imprimables"],["evaluation","Évaluation","AFL1, AFL2, AFL3"],["sources","Sources","Laurent Lecomte, Brzycki, BO 2026"]]}],
  urlOutil:id=>APP.old+'#tab-'+id,
  racc:[[/mots|nuage|échelle/i,'nuage','Nuage de mots'],[/défi|10 RM|No REP/i,'defi','Défi 10 RM'],[/mobile|charge max|%/i,'mobiles','Les 3 mobiles'],[/pareur|sécurité|règles/i,'securite','Sécurité'],[/évalu|AFL/i,'evaluation','Évaluation']],
  schemaDe:e=>{if(!e||!e.spec)return '';return schema(e.spec)},
  plan(c,id){
    const s=sea(c,id);if(!s)return [];
    let fi=0;
    return s.tl.map(t=>{const typ=t[2],dur=+t[1];
      if(typ==='inst')return {k:'info',typ,label:t[0],court:'Install.',dur};
      const e=s.ex[fi],lab=e?courtM(e.t):t[0];
      return {k:'ex',typ,ref:{c,id,i:fi++},label:lab,dur}})
     .map(x=>(x.orig=x.dur,x.st='todo',x));
  },
  blocInfo(b,s,i){
    const circ=s.n==='S1'?`<h2 class="rub">Le circuit (5 min par atelier)</h2>${ateliersHTML(CIRCUIT_S1)}`:'';
    const test=s.n==='S2'?`<h2 class="rub">Les 6 ateliers du test</h2>${ateliersHTML(ATELIERS_TEST)}`:'';
    return `<h2 class="rub">Objectif de la séance</h2><p class="texte">${esc(s.obj)}</p>${s.install?`<h2 class="rub">Installation</h2>${orgHTML(s.install)}`:''}${circ}${test}${s.prepare.length?`<h2 class="rub">Ce que la séance prépare</h2><ul class="org">${s.prepare.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}<h2 class="rub">Sécurité</h2><p class="texte">${esc(SECU.devise)}</p>`},
  bascule:s=>''
};

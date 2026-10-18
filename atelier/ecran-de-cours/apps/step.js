/* Écran de cours — step : ce qui est propre à l'activité.
   Source : mon-eps/atelier/ecran-de-cours/apps/. Le moteur commun est ecran.js. */
/* Le cycle de step tient en un niveau (Seconde). Chaque séance garde son déroulé (tl) et ses fiches. */
const court1=t=>String(t||'').split(/\s:\s|\s·\s/)[0];
const conv=f=>({t:f.titre,k:f.cat,disp:f.dispo,four:f.roles,deroul:f.deroul||[],cons:f.crit?[f.crit]:[],reus:f.reussite,moins:f.moins,plus:f.plus,spec:f.schema,defi:f.defi});
const STEP=SEANCES.map(S=>({id:S.id.toLowerCase(),n:S.id,title:S.titre,short:court1(S.titre),obj:S.obj,bpm:S.bpm,pas:S.pas,prepare:S.prepare||[],accueil:S.accueil,install:S.install,
  tl:S.tl.map(t=>[t[0],String(t[1]),t[2]]),ex:S.fiches.map(conv),evalPage:false,status:/^Évaluation/.test(S.titre)?'eval':''}));
const APP={
  old:'cycle-step-old.html',
  cle:'st',
  niv:{s:{label:'Seconde',court:'2de',long:'SECONDE',L:STEP}},
  defaut:'s',
  lienOld:()=>APP.old,
  lireCur(){const j=lire('step2de_jour',-1);return {s:j>=0&&STEP[j]?STEP[j].id:''}},
  marquerJour(c,id){const j=STEP.findIndex(s=>s.id===id);if(j<0)return;ecrire('step2de_jour',j);CUR.s=id},
  outils:[{"titre": "Pendant le cours", "items": [["chrono", "Chrono", "blocs et musique"], ["echauff", "Échauffements", "fiches"], ["pas", "16 pas", "fiches des pas"], ["blocs", "Blocs et curseurs", "construire un bloc"]]}, {"titre": "Adapter", "items": [["fc", "Filières et FC", "calcul des fréquences"], ["banque", "Banque", "exercices de rechange"], ["diff", "Différenciation", "par niveau"], ["defis", "Défis", "pour relancer"]]}, {"titre": "Évaluer", "items": [["eval", "Évaluation", "barème et grille"], ["carnet", "Carnet", "suivi des élèves"], ["reperes", "Repères et sources", "pour préparer"]]}],
  urlOutil:id=>APP.old+'#tab-'+id,
  racc:[[/^ech$/,'echauff','Fiches d’échauffement'],[/filière|fréquence cardiaque|\bFC\b|chrono/i,'chrono','Chrono des filières'],[/défi/i,'defis','Défis']],
  schemaDe:e=>{if(!e||!e.spec)return '';const h=schema(e.spec);return h?`<div class="schema-step">${h}</div>`:''},
  /* accueil et installation : des blocs d'information, sans fiche */
  plan(c,id){
    const s=sea(c,id);if(!s)return [];
    let fi=0;
    return s.tl.map(t=>{const typ=t[2],dur=+t[1];
      if(typ==='acc'||typ==='inst')return {k:'info',typ,label:t[0],court:typ==='acc'?'Accueil':'Install.',dur};
      const e=s.ex[fi],lab=(typ==='ex'||typ==='sf')&&e?court1(e.t):t[0];
      return {k:'ex',typ,ref:{c,id,i:fi++},label:lab,dur}})
     .map(x=>(x.orig=x.dur,x.st='todo',x));
  },
  blocInfo(b,s,i){const t=b.typ==='acc'?s.accueil:s.install;
    return `${t?`<h2 class="rub">${b.typ==='acc'?'Accueil':'Installation'}</h2>${orgHTML(t)}`:''}${i===0?`<h2 class="rub">Objectif de la séance</h2><p class="texte">${esc(s.obj)}</p>`:''}${s.pas&&i===0?`<h2 class="rub">Pas du jour</h2><p class="texte">${esc(s.pas)}</p>`:''}${s.prepare.length&&i===0?`<h2 class="rub">Ce que la séance prépare pour l’évaluation</h2><ul class="org">${s.prepare.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}`},
  bascule:s=>s&&s.bpm?`<span class="bascule" style="display:inline-grid;place-items:center">♪ ${esc(s.bpm)} BPM</span>`:''
};

/* Écran de cours — gymnastique : ce qui est propre à l'activité.
   Source : mon-eps/atelier/ecran-de-cours/apps/. Le moteur commun est ecran.js. */
/* Le cycle de gymnastique tient en un niveau (Première). Chaque séance garde son déroulé (tl) et ses fiches. */
const courtG=t=>String(t||'').split(/\s:\s|\s·\s/)[0];
const convG=f=>({t:f.titre,k:f.cat,disp:f.dispo,four:f.roles,deroul:f.deroul||[],cons:f.crit?[f.crit]:[],reus:f.reussite,moins:f.moins,plus:f.plus,spec:f.schema});
const GYMC=SEANCES.map(S=>({id:S.id.toLowerCase(),n:S.id,title:S.titre,short:courtG(S.titre),obj:S.obj,prepare:S.prepare||[],install:S.install,bilan:S.bilan,
  tl:S.tl.map(t=>[t[0],String(t[1]),t[2]]),ex:S.fiches.map(convG),evalPage:false,status:/validations et bilan/i.test(S.titre)?'eval':''}));
const APP={
  old:'outils.html',
  cle:'gy',
  niv:{p:{label:'Première',court:'1re',long:'PREMIÈRE',L:GYMC}},
  defaut:'p',
  lienOld:()=>APP.old,
  lireCur(){const j=lire('gym1re_jour',-1);return {p:j>=0&&GYMC[j]?GYMC[j].id:''}},
  marquerJour(c,id){const j=GYMC.findIndex(s=>s.id===id);if(j<0)return;ecrire('gym1re_jour',j);CUR.p=id},
  outils:[{"titre":"Pendant le cours","items":[["ateliers","Ateliers et niveaux","A à F, critères, ⚠️"],["installation","Installation","matériel, plan, rotation"],["echauff","Échauffements","les 8 et la banque"]]},
          {"titre":"Sécurité","items":[["securite","Règles","zones clés, postures"],["parade","Parade et aide","quand, où, comment"]]},
          {"titre":"Valider","items":[["validation","Validation E et P","règles, note 16 + 4"],["sources","Repères et sources","pour préparer"]]}],
  urlOutil:id=>APP.old+'#tab-'+id,
  racc:[[/parade|pareur|parer/i,'parade','Parade et aide'],[/rotation|atelier/i,'installation','Installation et rotation'],[/validation|valide|« Montrer au professeur »/i,'validation','Validation E et P'],[/échauffement|zones clés/i,'echauff','Échauffements'],[/niveau|⚠️/i,'ateliers','Ateliers et niveaux']],
  schemaDe:e=>{if(!e||!e.spec)return '';return schema(e.spec)},
  /* l'installation : un bloc d'information, sans fiche */
  plan(c,id){
    const s=sea(c,id);if(!s)return [];
    let fi=0;
    return s.tl.map(t=>{const typ=t[2],dur=+t[1];
      if(typ==='acc'||typ==='inst')return {k:'info',typ,label:t[0],court:'Install.',dur};
      const e=s.ex[fi],lab=e?courtG(e.t):t[0];
      return {k:'ex',typ,ref:{c,id,i:fi++},label:lab,dur}})
     .map(x=>(x.orig=x.dur,x.st='todo',x));
  },
  blocInfo(b,s,i){
    const mat=`<h2 class="rub">Chaque groupe installe son atelier</h2><ul class="org">${ATELIERS.map(a=>`<li><b>${a.n}. ${esc(a.court)}</b> : ${esc(a.mat.join(' ; '))}</li>`).join('')}</ul>`;
    return `${i===0?`<h2 class="rub">Objectif de la séance</h2><p class="texte">${esc(s.obj)}</p>`:''}${s.install?`<h2 class="rub">Installation</h2>${orgHTML(s.install)}`:''}${i===0?mat:''}${s.prepare.length&&i===0?`<h2 class="rub">Ce que la séance prépare</h2><ul class="org">${s.prepare.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}${i>0?`<h2 class="rub">Rangement</h2><p class="texte">Chaque groupe range SON atelier : tapis empilés par taille, rien ne reste sur le praticable.</p>`:''}`},
  bascule:s=>''
};

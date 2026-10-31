/* Écran de cours — cross training : ce qui est propre à l'activité.
   Source : mon-eps/atelier/ecran-de-cours/apps/. Le moteur commun est ecran.js. */
/* 4 parcours de 9 séances : Première et Terminale, en démarche progressive ou GAREEPS.
   La bascule en haut change de niveau ou de démarche ; chaque parcours garde sa séance du jour. */
const courtCT=t=>String(t||'').split(/\s:\s|\s·\s/)[0];
const convCT=f=>({t:f.titre,k:f.cat,disp:f.dispo,four:f.roles,deroul:f.deroul||[],cons:f.crit?[f.crit]:[],reus:f.reussite,moins:f.moins,plus:f.plus,spec:f.schema});
const versEcran=L=>L.map(S=>({id:S.id.toLowerCase(),n:S.id,title:S.titre,short:courtCT(S.titre),obj:S.obj,mat:S.mat,prepare:S.prepare||[],install:S.install,
  tl:S.tl.map(t=>[t[0],String(t[1]),t[2]]),ex:S.fiches.map(convCT),evalPage:false,status:S.status==='eval'?'eval':''}));
const NIV_CT={p:['Première','1re','PREMIÈRE'],g:['Première','1re','PREMIÈRE'],t:['Terminale','Tle','TERMINALE'],h:['Terminale','Tle','TERMINALE']};
const DEM_CT={p:'progressive',t:'progressive',g:'GAREEPS',h:'GAREEPS'};
const APP={
  old:'outils.html',
  cle:'ct',
  niv:Object.fromEntries(Object.keys(PARCOURS).map(k=>[k,{label:NIV_CT[k][0]+' · '+DEM_CT[k],court:NIV_CT[k][1],long:NIV_CT[k][2]+' · '+DEM_CT[k].toUpperCase(),L:versEcran(PARCOURS[k].L)}])),
  defaut:'p',
  lienOld:(c,id)=>'outils.html#seance-'+c+'-'+String(id||'s1').toUpperCase(),
  lireCur(){const o={};for(const k of Object.keys(PARCOURS)){const j=lire('ct_jour_'+k,-1),L=APP.niv[k].L;o[k]=j>=0&&L[j]?L[j].id:''}return o},
  marquerJour(c,id){const j=APP.niv[c].L.findIndex(s=>s.id===id);if(j<0)return;ecrire('ct_jour_'+c,j);CUR[c]=id},
  outils:[{"titre":"Pendant le cours","items":[["mouvements","Mouvements","photos, critères, − et +"],["formats","Formats","Tabata, EMOM, AMRAP…"],["chrono","Appli élève","carnet et chrono"],["echauff","Échauffements","guidé et autonome"]]},
          {"titre":"Adapter","items":[["mobiles","Mobiles et FC","les 2 mobiles de l’épreuve"],["banque","Banque","situations de rechange"],["diff","Différenciation","douleurs, débutants, experts"],["gareeps","GAREEPS","étoile, SCE, SRP, STOM"]]},
          {"titre":"Évaluer","items":[["eval","Épreuve","référentiel, jour J, barèmes"],["carnet","Carnet","à imprimer"],["sources","Sources","pour préparer"]]}],
  urlOutil:id=>id==='chrono'?'https://yannickdartois-hue.github.io/cross-training-eleves/':APP.old+'#tab-'+id,
  racc:[[/TABATA|Tabata|EMOM|AMRAP|for time/,'formats','Les formats'],[/mobile|FC visée|fourchette/i,'mobiles','Mobiles et FC'],[/étoile|SCE|SRP|STOM/,'gareeps','Démarche GAREEPS'],[/^ech$/,'echauff','Échauffements'],[/kettlebell|barre|box|swing|thruster/i,'mouvements','Mouvements']],
  schemaDe:e=>{if(!e||!e.spec)return '';return schema(e.spec)},
  plan(c,id){
    const s=sea(c,id);if(!s)return [];
    let fi=0;
    return s.tl.map(t=>{const typ=t[2],dur=+t[1];
      if(typ==='inst')return {k:'info',typ,label:t[0],court:'Install.',dur};
      const e=s.ex[fi];
      return {k:'ex',typ,ref:{c,id,i:fi++},label:typ==='ex'||typ==='sf'?(e?courtCT(e.t):t[0]):t[0],court:t[0],dur}})
     .map(x=>(x.orig=x.dur,x.st='todo',x));
  },
  blocInfo(b,s,i){return `${s.install?`<h2 class="rub">Installation</h2>${orgHTML(s.install)}`:''}<h2 class="rub">Objectif de la séance</h2><p class="texte">${esc(s.obj)}</p>${s.mat?`<p class="texte">Matériel : <span class="mat-jour">${esc(s.mat)}</span></p>`:''}${s.prepare.length?`<h2 class="rub">Ce que la séance prépare pour l’évaluation</h2><ul class="org">${s.prepare.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}`},
  /* bascule : niveau (1re / Tle) et démarche (progressive / GAREEPS) */
  bascule(){const c=J.c,niv=(c==='p'||c==='g')?'1':'T',dem=(c==='g'||c==='h')?'G':'P';
    const vers=(n,d)=>({'1P':'p','1G':'g','TP':'t','TG':'h'})[n+d];
    const b=(k,lab,on)=>`<button type="button" data-ctc="${k}" class="${on?'on':''}" aria-pressed="${on}">${lab}</button>`;
    return `<span class="ct-bas">${b(vers('1',dem),'1re',niv==='1')}${b(vers('T',dem),'Tle',niv==='T')}${b(vers(niv,'P'),'Prog<span class="lg">ressive</span>',dem==='P')}${b(vers(niv,'G'),'GAREEPS',dem==='G')}</span>`}
};
document.addEventListener('click',ev=>{const x=ev.target.closest('[data-ctc]');if(!x)return;const c=x.dataset.ctc;if(c===J.c)return;
  const i=Math.max(0,CYC[J.c].L.findIndex(s=>s.id===J.id));const id=CUR[c]||(CYC[c].L[i]||CYC[c].L[0]).id;allerA(c,id)});

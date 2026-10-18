/* =====================================================================
   ecran.js — moteur de l'écran de cours des cycles EPS (Lycée Pompidou)
   Fichier COMMUN, identique dans chaque dépôt. Ne pas le modifier dans un
   dépôt : le modifier dans mon-eps/atelier/ecran-de-cours/, puis lancer
   construire.py, qui le recopie partout.
   Ce qui change d'une activité à l'autre est dans l'objet APP, déclaré
   dans l'index.html de l'activité (source : apps/<activité>.js) :
     old, cle, niv, defaut, lienOld, lireCur, marquerJour, outils, urlOutil,
     racc, schemaDe ; facultatifs : plan, etapesEchauff, blocInfo, bascule.
   ===================================================================== */
'use strict';
globalThis.COURT_PR=0.42; /* joueurs dessinés plus gros sur l'écran terrain */
/* ================== Données ================== */
const OLD=APP.old;
const NIV=APP.niv;
const ORDRE=Object.keys(NIV);
const CYC=Object.fromEntries(ORDRE.map(k=>[k,{label:NIV[k].label,L:NIV[k].L}]));
const lienOld=(c,id)=>APP.lienOld?APP.lienOld(c,id):OLD;
const K=n=>APP.cle+'-'+n;   /* clés de l'appareil : bd-jour, bd-notes, bd-reports… */
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const lire=(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}};
const ecrire=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const auj=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const sea=(c,id)=>(CYC[c]||CYC[APP.defaut]).L.find(s=>s.id===id);
const exDe=r=>{const s=sea(r.c,r.id);return s&&s.ex?s.ex[r.i]:null};
function exListe(s){if(!s||!s.ex||!s.tl)return [];if(Array.isArray(s.ex))return s.ex.map((e,i)=>({e,i,d:s.tl[i+1]?+s.tl[i+1][1]:15,l:s.tl[i+1]?s.tl[i+1][0]:e.t}));return s.tl.filter(t=>t[2]!=='warm'&&t[2]!=='bilan'&&s.ex[t[2]]).map(t=>({e:s.ex[t[2]],i:t[2],d:+t[1],l:t[0]}))}
const aEx=s=>exListe(s).length>0;
/* séance du jour : celle marquée dans l'outil complet (même appareil) */
const CUR=Object.assign(Object.fromEntries(ORDRE.map(k=>[k,''])),APP.lireCur());
function relireCur(){Object.assign(CUR,APP.lireCur())}

function plan(c,id){
  if(APP.plan)return APP.plan(c,id);
  const s=sea(c,id);if(!s||!s.tl||!s.ex)return [];
  let b;
  if(s.tl.some(t=>t.length>2)){
    b=s.tl.map(t=>{const key=t[2],dur=+t[1];
      if(key==='warm')return {k:'warm',label:t[0],dur};
      if(key==='bilan')return {k:'bilan',label:t[0],dur};
      return {k:'ex',ref:{c,id,i:key},label:t[0],dur}});
  } else {
    b=[{k:'warm',label:s.tl[0][0],dur:+s.tl[0][1]}];
    s.ex.forEach((e,i)=>{const t=s.tl[i+1];if(t&&!(i+1===s.tl.length-1&&/^Bilan/.test(t[0])))b.push({k:'ex',ref:{c,id,i},label:t[0],dur:+t[1]})});
    const last=s.tl[s.tl.length-1];b.push({k:'bilan',label:last[0],dur:+last[1]});
  }
  return b.map(x=>(x.orig=x.dur,x.st='todo',x));
}
/* L'état du jour : valable pour cette séance, ce jour-là seulement. */
let J=lire(K('jour'),null);
function nouveau(c,id){J={date:auj(),c,id,blocks:plan(c,id),cur:0,vu:null,started:null,bt:null,pausedAt:null,pauseMs:0,fin:null,son:J?J.son!==false:true};
  const att=J.blocks.reduce((a,b)=>a+b.dur,0);J.cible=att;sauver()}
function sauver(){ecrire(K('jour'),J)}
function seanceDuJour(){const d=APP.defaut,c=CUR[d]?d:(ORDRE.find(k=>CUR[k])||d);return {c,id:CUR[c]||CYC[c].L[0].id}}
if(!J||J.date!==auj()||!CYC[J.c]||!sea(J.c,J.id)){const d=seanceDuJour();nouveau(d.c,d.id)}
if(J.son===undefined)J.son=true;

/* ================== Temps ================== */
const hm=ms=>{const d=new Date(ms);return d.getHours()+' h '+String(d.getMinutes()).padStart(2,'0')};
const mmss=s=>{const a=Math.abs(Math.round(s));return Math.floor(a/60)+':'+String(a%60).padStart(2,'0')};
function horaires(){
  const now=Date.now(),out=[];let t=null;
  J.blocks.forEach((b,i)=>{
    if(b.st==='zap'){out.push(null);return}
    if(b.st==='done'){out.push({s:b.s,e:b.e});t=b.e;return}
    if(i===J.cur&&J.bt){const p=J.pauseMs+(J.pausedAt?now-J.pausedAt:0);const e=J.bt+b.dur*60000+p;out.push({s:J.bt,e});t=Math.max(e,now);return}
    const s=Math.max(t||now,now);const e=s+b.dur*60000;out.push({s,e});t=e;
  });
  return out;
}
function restant(){const b=J.blocks[J.cur];if(!b||!J.bt)return null;const now=Date.now();const p=J.pauseMs+(J.pausedAt?now-J.pausedAt:0);return (J.bt+b.dur*60000+p-now)/1000}
function finPrevue(){const h=horaires().filter(Boolean);return h.length?h[h.length-1].e:null}
function retardMin(){if(!J.started)return 0;const f=finPrevue();return Math.round((f-(J.started+J.cible*60000))/60000)}

/* ================== Schéma ================== */
const schemaDe=e=>APP.schemaDe(e);

/* ================== Textes : échauffement, organisation ================== */
// Repères chiffrés en gras : on les trouve d'un coup d'œil.
function grasChiffres(t){return esc(t).replace(/(\d+(?:,\d+)?(?:\s?[×x]\s?\d+(?:,\d+)?)?(?:\s?(?:m|min|s|fois|ballons?|équipes?|terrains?|services?|séries?|joueurs?|réceptionneurs?|passeurs?|tours?|points?))?)(?![\w’])/g,'<b>$1</b>')}
function phrases(t){return String(t||'').split(/(?<=[.;])(?<!(?:^|[\s(])[A-ZÀ-Ý]\.)\s+(?=[A-ZÀ-Ý0-9«(])/).map(x=>x.replace(/[;]$/,'').trim()).filter(Boolean)}
function orgHTML(t){const p=phrases(t);return p.length>1?`<ul class="org">${p.map(x=>`<li>${grasChiffres(x)}</li>`).join('')}</ul>`:`<p class="texte">${grasChiffres(t)}</p>`}
function etapesEchauff(s,b){
  if(APP.etapesEchauff)return APP.etapesEchauff(s,b);
  const brut=String(s.warm||'').replace(/<a [^>]*>.*?<\/a>/g,'').replace(/<[^>]+>/g,'').trim();
  return `<div style="margin-top:14px">${orgHTML(brut)}</div>`;
}

/* ================== Rendu ================== */
const $=id=>document.getElementById(id);
function exDuBloc(b){return b&&b.k==='ex'?exDe(b.ref):null}
function titreBloc(b){return b.label}
const norm=t=>String(t||'').toLowerCase().replace(/^fil rouge \d+\s*·\s*/,'').replace(/[^a-z0-9àâäéèêëïîôöùûüç]+/g,' ').trim();
function texteChaud(html){return String(html||'').replace(/<a [^>]*data-go="(\w+)"[^>]*>(.*?)<\/a>/g,(m,go,t)=>`<a href="${OLD}" data-ov="${go}">${t}</a>`)}

function rendre(){
  const s=sea(J.c,J.id);
  ORDRE.forEach(k=>document.body.classList.toggle('niv-'+k,J.c===k));
  $('cyPast').textContent=NIV[J.c].court;
  const L=CYC[J.c].L,ij=L.findIndex(x=>x.id===CUR[J.c]);
  $('niveau').innerHTML=`<span class="nn">${NIV[J.c].long}</span><nav class="strip" aria-label="Séances du cycle">${L.map((x,k)=>{
      const cl=[x.id===J.id?'ici':'',x.evalPage||x.status==='eval'?'eval':'',ij>=0&&k<ij?'fait':'',k===ij?'jour':''].filter(Boolean).join(' ');
      return `<button type="button" class="${cl}" data-seance="${x.id}" title="${esc(x.n+' · '+x.title)}"${x.id===J.id?' aria-current="true"':''}>${esc(x.n.replace(' bis','b'))}</button>`}).join('')}</nav>${APP.bascule?APP.bascule(s):ORDRE.length>1?`<button type="button" class="bascule" data-act="niv">${NIV[ORDRE[(ORDRE.indexOf(J.c)+1)%ORDRE.length]].label} ›</button>`:''}`;
  const ici=$('niveau').querySelector('.ici');if(ici)ici.scrollIntoView({block:'nearest',inline:'center'});
  $('titre').textContent=s?s.n+' · '+s.title:'';
  $('prep').href=lienOld(J.c,J.id);
  rendreDeroule();rendreZone();rendreInfo();
}
function rendreDeroule(){
  const h=horaires(),vu=J.vu!=null?J.vu:J.cur;
  const vis=J.blocks.map((b,i)=>({b,i})).filter(x=>x.b.st!=='zap'||true);
  let l='',t='';
  vis.forEach(({b,i})=>{
    const cls=b.st==='done'?'fait':b.st==='zap'?'zap':i===J.cur?'now':'';
    const w=b.st==='zap'?3:b.dur;
    l+=`<button type="button" style="flex:${w}" class="${cls}${i===vu?' vu':''}" data-voir="${i}" aria-label="${esc(b.label)}"></button>`;
    const d=b.dur-b.orig,mod=b.st!=='zap'&&d?`<span class="modif${d<0?' moins':''}" style="display:inline-block">${d>0?'+':'−'}${Math.abs(d)}</span>`:'';
    const heure=b.st==='zap'?'zappé':(J.started&&h[i]?hm(h[i].s):b.dur+' min');
    t+=`<button type="button" style="flex:${w}" class="${cls}" data-voir="${i}"><b>${heure}${mod}</b><span>${esc(b.court||b.label)}</span></button>`;
  });
  let cur='';
  if(J.started&&!J.fin){const tot=h.filter(Boolean),deb=J.started,fin=tot.length?tot[tot.length-1].e:deb;
    // position du curseur : proportionnelle au temps dans le bloc en cours, sur la largeur dessinée
    const ws=J.blocks.map(b=>b.st==='zap'?3:b.dur),W=ws.reduce((a,b)=>a+b,0);
    let acc=0;for(let i=0;i<J.cur;i++)acc+=ws[i];
    const r=restant(),b=J.blocks[J.cur];let frac=0;if(b&&J.bt&&r!=null)frac=Math.min(1,Math.max(0,1-r/(b.dur*60)));
    const pos=(acc+frac*(ws[J.cur]||0))/W*100;
    const k=pos<6?Math.max(4,pos*50/6):pos>94?100-Math.max(4,(100-pos)*50/6):50;
    cur=`<div class="curseur" style="left:calc(18px + (100% - 36px) * ${pos/100});--k:${k.toFixed(1)}">${hm(Date.now())}</div>`;}
  $('deroule').innerHTML=cur+`<div class="ligneT">${l}</div><div class="blocs">${t}</div>`;
}
function variables(e){
  if(e&&e.fixe&&!(e.moins||e.plus))return `<div class="fixe"><b>Pas de variable.</b> ${esc(e.fixe)}</div>`;
  if(!e||!(e.moins||e.plus))return '';
  return `<div class="vars">${e.moins?`<div class="v m"><b><i>−</i>Plus facile</b>${esc(e.moins)}</div>`:''}${e.plus?`<div class="v p"><b><i>+</i>Plus difficile</b>${esc(e.plus)}</div>`:''}</div>`;
}
function suivantDe(i){for(let k=i+1;k<J.blocks.length;k++)if(J.blocks[k].st==='todo')return k;return -1}
function rendreZone(){
  const z=$('zone');
  if(J.fin){z.innerHTML=finHTML();lierFin();return}
  const i=J.vu!=null?J.vu:J.cur,b=J.blocks[i];if(!b){z.innerHTML='';return}
  const e=exDuBloc(b),s=sea(J.c,J.id),h=horaires()[i];
  const apercu=J.vu!=null&&J.vu!==J.cur;
  const enCours=!apercu&&i===J.cur&&!!J.bt;
  const d=b.dur-b.orig;
  const tagMod=d?`<span class="tag${d<0?' moins':''}">${d>0?'rallongé':'raccourci'} de ${Math.abs(d)} min</span>`:'';
  let etiq,quand;
  if(apercu){etiq=b.st==='done'?'Bloc fait':b.st==='zap'?'Bloc zappé':'Aperçu, plus tard';quand=`${b.dur} min${h&&J.started?', vers '+hm(h.s):''}`}
  else if(enCours){etiq='En cours';quand=`Jusqu’à ${hm(h.e)} ${tagMod}`}
  else {etiq=J.started?'À lancer maintenant':'Pour commencer';quand=`${b.dur} min ${tagMod}`}
  let corps='';
  if(b.k==='info'){corps=APP.blocInfo?APP.blocInfo(b,s,i):''}
  else if(b.k==='warm'){corps=etapesEchauff(s,b)}
  else if(b.k==='bilan'){corps=`<h2 class="rub">Bilan avec les élèves</h2><div class="texte"><p>${esc(s.bilan||'Ce qui a progressé, ce qui reste à travailler, ce qui vient la prochaine fois.')}</p></div>`}
  else if(e){
    const avant=!enCours;
    const roles=e.four?`<div class="roles"><small>Rôle de chacun</small><p>${grasChiffres(e.four)}</p></div>`:'';
    const org=`<h2 class="rub">Organisation</h2>${orgHTML(e.disp)}`;
    const der=`<h2 class="rub">Déroulement</h2><ol class="der">${(e.deroul||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`;
    const reus=(e.defi?`<div class="defi"><b>Défi :</b> ${esc(e.defi)}</div>`:'')+(e.reus?`<p class="reussite"><b>Réussi si</b> ${esc(e.reus)}</p>`:'');
    corps=avant?(org+roles+reus+variables(e)):(der+reus+variables(e)+`<details class="revoir"><summary>Revoir l’organisation</summary>${org.replace('<h2 class="rub">Organisation</h2>','')}${roles}</details>`);
  }
  let ctrl='';
  if(apercu){ctrl=`<div class="lance"><button class="bt noir" type="button" data-act="retour">Revenir au bloc en cours</button>${b.st==='todo'?`<button class="bt clair" type="button" data-act="zap" data-i="${i}">Zapper ce bloc</button>`:''}</div>`}
  else if(enCours){ctrl=`<div class="reglage"><div class="chrono" id="chrono"><span class="num">–</span><small>restantes</small></div><button class="bt jaune" type="button" data-act="plus" data-v="2">+ 2 min</button><button class="bt jaune" type="button" data-act="plus" data-v="5">+ 5 min</button><button class="bt clair" type="button" data-act="pause" id="btPause">Pause</button><button class="bt noir suiv" type="button" data-act="suivant">${suivantDe(i)<0?'Terminer la séance':'Bloc suivant'}</button></div>`}
  else {ctrl=`<div class="lance"><button class="bt noir go" type="button" data-act="go">${J.started?'C’est parti':'Démarrer la séance'}</button><button class="bt clair" type="button" data-act="zap" data-i="${i}">Zapper</button></div>`}
  const carte=`<article class="carte${apercu?' apercu':enCours?'':' attente'}"><p class="etiq"><span class="nv">${NIV[J.c].court}</span>${etiq}</p><h1>${esc(titreBloc(b))}</h1>${e&&norm(e.t)!==norm(b.label)?`<p class="fiche">Fiche : ${esc(e.t)}</p>`:''}<p class="quand">${quand}</p>${enCours?ctrl:''}${raccourcis(b,e)}${corps}${enCours?'':ctrl}</article>`;
  // colonne de droite : schéma, consignes, ensuite
  let cote='';
  if(e){cote+=`<div class="boite"><h2>${esc(e.k||'Schéma')}</h2>${schemaDe(e)||'<p class="cap">Pas de schéma pour cette situation.</p>'}</div>`;
    if(e.cons&&e.cons.length)cote+=`<div class="boite"><h2>Consignes de réalisation</h2><ul>${e.cons.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`}
  const k=suivantDe(apercu?J.cur:i);
  if(!apercu&&k>=0){const nb=J.blocks[k];cote+=`<div class="ensuite"><div><small>Ensuite${J.started&&horaires()[k]?', vers '+hm(horaires()[k].s):''}</small><b>${esc(nb.label)}</b> <span class="cap">${nb.dur} min</span></div><button class="bt clair" type="button" data-act="voir" data-i="${k}">Voir</button><button class="bt clair" type="button" data-act="zap" data-i="${k}">Zapper</button></div>`}
  z.innerHTML=carte+`<aside class="cote">${cote}</aside>`;
  tic();
}
function rendreInfo(){
  const f=finPrevue(),r=retardMin();
  let txt;
  if(J.fin)txt=`Séance terminée à <b>${hm(J.fin)}</b>`;
  else if(!J.started)txt=`Séance de <b>${J.cible} min</b> de pratique. Touche « Démarrer » au coup de sifflet.`;
  else txt=`Fin prévue <b class="${r>0?'retard':''}">${hm(f)}</b>${r>0?` · ${r} min de plus que prévu`:r<0?` · ${-r} min d’avance`:''}`;
  $('info').innerHTML=txt;
}
let bipFait=false;
function tic(){
  const c=$('chrono');if(!c)return;
  const r=restant();if(r==null)return;
  c.querySelector('span').textContent=(r<0?'+':'')+mmss(r);
  c.querySelector('small').textContent=r<0?'de dépassement':J.pausedAt?'en pause':'restantes';
  c.classList.toggle('fini',r<0);c.classList.toggle('pause',!!J.pausedAt);
  const bp=$('btPause');if(bp)bp.textContent=J.pausedAt?'Reprendre':'Pause';
  if(r<0&&!bipFait&&!J.pausedAt){bipFait=true;if(J.son)bip()}
}
setInterval(()=>{if(J.started&&!J.fin){tic();rendreDeroule();rendreInfo()}},1000);

/* ================== Actions ================== */
let ac=null;
function bip(){try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();[0,.25].forEach(t=>{const o=ac.createOscillator(),g=ac.createGain();o.frequency.value=880;g.gain.setValueAtTime(.0001,ac.currentTime+t);g.gain.exponentialRampToValueAtTime(.25,ac.currentTime+t+.02);g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+t+.18);o.connect(g).connect(ac.destination);o.start(ac.currentTime+t);o.stop(ac.currentTime+t+.2)})}catch(e){}}
let verrou=null;
async function eveil(){try{if('wakeLock' in navigator&&!verrou&&document.visibilityState==='visible'){verrou=await navigator.wakeLock.request('screen');verrou.addEventListener('release',()=>{verrou=null})}}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&J.started&&!J.fin)eveil()});
function toast(t){const d=document.createElement('div');d.className='toast';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),2600)}

function lancer(){
  const now=Date.now();
  if(!J.started)J.started=now;
  if(J.blocks[J.cur].st!=='todo'){const k=suivantDe(J.cur-1);if(k<0)return;J.cur=k}
  J.bt=now;J.pauseMs=0;J.pausedAt=null;J.vu=null;bipFait=false;sauver();eveil();
  try{ac=ac||new (window.AudioContext||window.webkitAudioContext)()}catch(e){}
  rendre();window.scrollTo({top:0,behavior:'smooth'});
}
function suivant(){
  const now=Date.now(),b=J.blocks[J.cur];
  if(J.pausedAt){J.pauseMs+=now-J.pausedAt;J.pausedAt=null}
  b.st='done';b.s=J.bt;b.e=now;
  const k=suivantDe(J.cur);
  J.bt=null;J.pauseMs=0;J.vu=null;
  if(k<0){J.fin=now;sauver();rendre();return}
  J.cur=k;sauver();rendre();window.scrollTo({top:0,behavior:'smooth'});
}
function zapper(i){const b=J.blocks[i];if(!b||b.st==='done')return;
  if(b.st==='zap'){b.st='todo'}else{if(i===J.cur&&J.bt)return toast('Termine d’abord le bloc en cours, ou passe au suivant.');b.st='zap';if(i===J.cur){const k=suivantDe(i);if(k>=0)J.cur=k}}
  if(J.vu===i)J.vu=null;sauver();rendre();if(panneauOuvert==='ajuster')ouvrirAjuster()}
document.addEventListener('click',ev=>{
  const v=ev.target.closest('[data-voir]');if(v){const i=+v.dataset.voir;J.vu=(i===J.cur)?null:i;rendreDeroule();rendreZone();return}
  const a=ev.target.closest('[data-act]');if(!a)return;
  const act=a.dataset.act,i=+a.dataset.i;
  if(act==='go')lancer();
  else if(act==='suivant')suivant();
  else if(act==='plus'){J.blocks[J.cur].dur+=+a.dataset.v;bipFait=restant()<0;sauver();rendre();toast(`Rallongé de ${a.dataset.v} min`)}
  else if(act==='pause'){const now=Date.now();if(J.pausedAt){J.pauseMs+=now-J.pausedAt;J.pausedAt=null}else J.pausedAt=now;sauver();tic();rendreInfo()}
  else if(act==='retour'){J.vu=null;rendreDeroule();rendreZone()}
  else if(act==='voir'){J.vu=i;rendreDeroule();rendreZone();window.scrollTo({top:0,behavior:'smooth'})}
  else if(act==='zap')zapper(i);
  else if(act==='niv'){const c=ORDRE[(ORDRE.indexOf(J.c)+1)%ORDRE.length];allerA(c,CUR[c]||CYC[c].L[0].id)}
});
/* balayage : passer d'un bloc à l'autre, en aperçu */
let x0=null,y0=null;
$('zone').addEventListener('touchstart',e=>{const t=e.touches[0];x0=t.clientX;y0=t.clientY},{passive:true});
$('zone').addEventListener('touchend',e=>{if(x0==null)return;const t=e.changedTouches[0],dx=t.clientX-x0,dy=t.clientY-y0;x0=null;
  if(Math.abs(dx)<70||Math.abs(dx)<Math.abs(dy)*1.5||J.fin)return;
  const cur=J.vu!=null?J.vu:J.cur,n=Math.max(0,Math.min(J.blocks.length-1,cur+(dx<0?1:-1)));
  J.vu=n===J.cur?null:n;rendreDeroule();rendreZone()},{passive:true});

/* ================== Fin de séance ================== */
function resume(){const r=[];J.blocks.forEach(b=>{if(b.st==='zap')r.push(`${esc(b.label)} : zappé`);else{const d=b.dur-b.orig;if(d)r.push(`${esc(b.label)} : ${d>0?'rallongé':'raccourci'} de ${Math.abs(d)} min`)}});return r}
function allerA(c,id){
  const s=sea(c,id);if(!s)return;
  if(!aEx(s)){location.href=lienOld(c,s.id);return}
  if(c===J.c&&id===J.id)return;
  if(J.started&&!J.fin&&!confirm(`Afficher ${CYC[c].label} ${s.n} ? Le déroulé en cours de ${sea(J.c,J.id).n} sera remis à zéro.`))return;
  nouveau(c,id);fermer();rendre();window.scrollTo({top:0});
}
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-seance]');if(b)allerA(J.c,b.dataset.seance)});
function seanceSuivante(){const L=CYC[J.c].L,i=L.findIndex(s=>s.id===J.id);return L[i+1]||null}
function finHTML(){
  const r=resume(),zaps=J.blocks.filter(b=>b.st==='zap'&&b.k==='ex'),nx=seanceSuivante();
  const notes=lire(K('notes'),{}),cle=J.date+' '+J.c+'-'+J.id;
  return `<article class="carte"><p class="etiq">Séance terminée</p><h1>Bilan de la séance</h1><p class="quand">Fin à ${hm(J.fin)}${J.started?`, ${Math.round((J.fin-J.started)/60000)} min de pratique`:''}</p>
  <h2 class="rub">Ce qui a changé</h2><div class="texte">${r.length?'<ul>'+r.map(x=>`<li>${x}</li>`).join('')+'</ul>':'<p>Le déroulé prévu a été suivi.</p>'}</div>
  ${zaps.length&&nx?`<h2 class="rub">Exercices zappés</h2>${zaps.map((b,k)=>`<label class="case"><input type="checkbox" data-rep="${J.blocks.indexOf(b)}" checked> Proposer « ${esc(b.label)} » au début de ${esc(nx.n)}</label>`).join('')}`:''}
  <h2 class="rub">Ce que je retiens (facultatif)</h2><textarea class="note" id="note" placeholder="Une phrase suffit.">${esc(notes[cle]||'')}</textarea>
  <div class="lance"><button class="bt noir go" type="button" id="btFin">Enregistrer</button><button class="bt clair" type="button" id="btRouvrir">Reprendre la séance</button></div></article>
  <aside class="cote"><div class="boite"><h2>Et ensuite</h2><p class="texte">${nx?`La prochaine séance est ${esc(nx.n)} · ${esc(nx.title)}. ${CUR[J.c]===nx.id?'C’est la séance du jour.':`<br><button class="bt noir" type="button" data-jour="${nx.id}" style="margin-top:10px">Faire de ${esc(nx.n)} la séance du jour</button>`}`:'C’était la dernière séance du cycle.'}</p></div></aside>`;
}
function lierFin(){
  $('btFin').onclick=()=>{const notes=lire(K('notes'),{});notes[J.date+' '+J.c+'-'+J.id]=$('note').value.trim();ecrire(K('notes'),notes);
    const nx=seanceSuivante(),reps=lire(K('reports'),[]);
    document.querySelectorAll('[data-rep]').forEach(c=>{const b=J.blocks[+c.dataset.rep];const exist=reps.findIndex(x=>x.ref&&b.ref&&x.ref.id===b.ref.id&&x.ref.i===b.ref.i&&x.pour===nx.id);
      if(c.checked&&exist<0&&nx)reps.push({c:J.c,pour:nx.id,depuis:sea(J.c,J.id).n,ref:b.ref,label:b.label,dur:b.orig});
      if(!c.checked&&exist>=0)reps.splice(exist,1)});
    ecrire(K('reports'),reps);toast('Bilan enregistré')};
  $('btRouvrir').onclick=()=>{J.fin=null;const b=J.blocks[J.cur];if(b&&b.st==='done'){b.st='todo';J.bt=null}sauver();rendre()};
}

/* ================== Panneaux ================== */
let panneauOuvert=null;
function fermer(){panneauOuvert=null;$('couche').innerHTML=''}
function panneau(cote,titre,html,bouton){
  $('couche').innerHTML=`<div class="voile" data-ferme></div><section class="panneau ${cote}" role="dialog" aria-label="${esc(titre)}"><div class="ptete"><h2>${esc(titre)}</h2><button class="bt noir" type="button" data-ferme>${bouton||'Terminé'}</button></div><div class="pc">${html}</div></section>`;
  $('couche').querySelectorAll('[data-ferme]').forEach(x=>x.onclick=()=>{fermer();rendre()});
}
/* --- Ajuster le déroulé --- */
function ouvrirAjuster(){
  panneauOuvert='ajuster';
  const h=horaires(),r=retardMin();
  let al='';
  if(J.started&&r>0){
    const k=suivantDe(J.cur);const futurs=J.blocks.map((b,i)=>({b,i})).filter(x=>x.b.st==='todo'&&x.i!==J.cur);
    const long=futurs.filter(x=>x.b.k==='ex').sort((a,b)=>b.b.dur-a.b.dur)[0];
    const bil=futurs.find(x=>x.b.k==='bilan');
    al=`<div class="alerte"><p>Avec ces changements, la séance finit à <b>${hm(finPrevue())}, ${r} min plus tard que prévu</b>.</p>
     ${long&&long.b.dur-r>=5?`<button class="bt" type="button" data-aj="moins" data-i="${long.i}" data-v="${r}">Retirer ${r} min à « ${esc(long.b.label)} »</button>`:''}
     ${long?`<button class="bt" type="button" data-aj="zap" data-i="${long.i}">Zapper « ${esc(long.b.label)} »</button>`:''}
     ${bil&&bil.b.dur>2?`<button class="bt" type="button" data-aj="moins" data-i="${bil.i}" data-v="${Math.min(r,bil.b.dur-1)}">Raccourcir le bilan de ${Math.min(r,bil.b.dur-1)} min</button>`:''}</div>`;
  } else if(J.started&&r<0){al=`<div class="alerte ok"><p><b>${-r} min d’avance.</b> Tu peux rallonger une situation qui marche.</p></div>`}
  const reps=lire(K('reports'),[]).filter(x=>x.c===J.c&&x.pour===J.id);
  const repH=reps.map((x,k)=>`<div class="report"><div><b>Reporté de ${esc(x.depuis)}</b> : ${esc(x.label)}, ${x.dur} min</div><button class="bt noir" type="button" data-aj="rep" data-k="${k}">Ajouter</button><button class="bt clair" type="button" data-aj="repx" data-k="${k}">Non</button></div>`).join('');
  const lignes=J.blocks.map((b,i)=>{
    const cls=b.st==='done'?'fait':b.st==='zap'?'zap':i===J.cur?'now':'';
    const d=b.dur-b.orig,hh=h[i];
    const sous=b.st==='done'?`fait, ${hm(b.s)} à ${hm(b.e)}`:b.st==='zap'?'zappé':i===J.cur&&J.bt?`en cours, jusqu’à ${hm(hh.e)}`:(J.started&&hh?`${hm(hh.s)} à ${hm(hh.e)}`:'à venir');
    const modif=b.st!=='done';
    return `<div class="ligneA ${cls}"><div class="nom">${esc(titreBloc(b))}<small>${sous}</small></div>
      <div class="pas">${modif?`<button type="button" data-aj="moins" data-i="${i}" data-v="1" aria-label="Une minute de moins">−</button>`:''}<span class="num">${b.dur}′${d?`<em>${d>0?'+':'−'}${Math.abs(d)}</em>`:''}</span>${modif?`<button type="button" data-aj="plus" data-i="${i}" aria-label="Une minute de plus">+</button>`:''}</div>
      ${modif?`<div class="act">${!(i===J.cur&&J.bt)?`<button class="bt${b.st==='zap'?' on':''}" type="button" data-aj="zap" data-i="${i}">${b.st==='zap'?'Rétablir':'Zapper'}</button>`:''}${b.k==='ex'&&!(i===J.cur&&J.bt)?`<button class="bt" type="button" data-aj="remp" data-i="${i}">Remplacer</button>`:''}${i>J.cur&&i>1?`<button class="bt" type="button" data-aj="haut" data-i="${i}">Monter</button>`:''}${i>J.cur&&i<J.blocks.length-2?`<button class="bt" type="button" data-aj="bas" data-i="${i}">Descendre</button>`:''}</div>`:''}</div>`;
  }).join('');
  panneau('droite','Ajuster le déroulé',al+repH+lignes+`<div class="ajout"><button class="bt" type="button" data-aj="ajout">+ Ajouter un exercice d’une autre séance</button></div>
   <p class="aide">Ces changements ne valent que pour la séance d’aujourd’hui. Demain, la séance repart de son plan d’origine.</p>
   <div class="reglages"><label class="case"><input type="checkbox" id="son" ${J.son?'checked':''}> Petit signal sonore en fin de bloc</label></div>
   <p class="aide"><button class="bt clair" type="button" data-aj="reset">Revenir au déroulé d’origine</button></p>`);
  $('son').onchange=e=>{J.son=e.target.checked;sauver()};
}
function deplacer(i,d){const j=i+d;if(j<=J.cur||j<1||j>J.blocks.length-2)return;const t=J.blocks[i];J.blocks[i]=J.blocks[j];J.blocks[j]=t}
document.addEventListener('click',ev=>{
  const a=ev.target.closest('[data-aj]');if(!a)return;
  const act=a.dataset.aj,i=+a.dataset.i,b=J.blocks[i];
  if(act==='plus'){b.dur+=1}
  else if(act==='moins'){b.dur=Math.max(1,b.dur-(+a.dataset.v||1))}
  else if(act==='zap'){zapper(i);return}
  else if(act==='haut')deplacer(i,-1);
  else if(act==='bas')deplacer(i,1);
  else if(act==='remp'){choisirExo(ex=>{b.ref=ex.ref;b.label=ex.label;sauver();ouvrirAjuster();rendre()},'Remplacer « '+b.label+' »');return}
  else if(act==='ajout'){choisirExo(ex=>{const pos=Math.max(J.cur+(J.bt?1:0),1);J.blocks.splice(pos,0,{k:'ex',ref:ex.ref,label:ex.label,dur:ex.dur,orig:ex.dur,st:'todo'});sauver();ouvrirAjuster();rendre()},'Ajouter un exercice');return}
  else if(act==='rep'||act==='repx'){const all=lire(K('reports'),[]),mine=all.filter(x=>x.c===J.c&&x.pour===J.id),x=mine[+a.dataset.k];
    if(act==='rep'){const pos=Math.max(J.cur+(J.bt?1:0),1);J.blocks.splice(pos,0,{k:'ex',ref:x.ref,label:x.label,dur:x.dur,orig:x.dur,st:'todo'})}
    all.splice(all.indexOf(x),1);ecrire(K('reports'),all)}
  else if(act==='reset'){if(!confirm('Revenir au déroulé d’origine ? Les blocs déjà faits restent faits.'))return;
    const p=plan(J.c,J.id);p.forEach((x,k)=>{const old=J.blocks.find(o=>o.st==='done'&&o.k===x.k&&JSON.stringify(o.ref)===JSON.stringify(x.ref));if(old)Object.assign(x,{st:'done',s:old.s,e:old.e})});J.blocks=p;J.cur=Math.max(0,J.blocks.findIndex(x=>x.st==='todo'));J.bt=null}
  sauver();rendre();ouvrirAjuster();
});
/* --- Choisir un exercice (autres séances) --- */
function choisirExo(cb,titre){
  const bouton=(c,s,x)=>{const e=x.e,i=x.i,d=x.d,l=x.l;
    return `<button type="button" data-c="${c}" data-id="${s.id}" data-i="${i}" data-d="${d}" data-l="${esc(l)}"><b>${esc(e.t)}</b><span>${d} min, ${esc(e.k||'')}</span></button>`};
  const groupes=ORDRE.slice().sort((a,b)=>a===J.c?-1:1).map(c=>CYC[c].L.filter(aEx).map(s=>`<h3>${esc(CYC[c].label)}, ${esc(s.n)} : ${esc(s.short)}</h3>`+exListe(s).map(x=>bouton(c,s,x)).join('')).join('')).join('');
  panneau('droite',titre,`<div class="choix">${groupes}</div>`,'Annuler');
  $('couche').querySelectorAll('.choix button').forEach(x=>x.onclick=()=>cb({ref:{c:x.dataset.c,id:x.dataset.id,i:/^\d+$/.test(x.dataset.i)?+x.dataset.i:x.dataset.i},label:x.dataset.l,dur:+x.dataset.d}));
}
/* --- Mes séances --- */
let cyVu=null;
function ouvrirSeances(){
  panneauOuvert='seances';cyVu=cyVu||J.c;
  const L=CYC[cyVu].L,cur=L.findIndex(s=>s.id===CUR[cyVu]);
  const cartes=L.map((s,i)=>{
    const etat=s.status==='eval'||s.evalPage?'eval':cur<0?'':i<cur?'fait':i===cur?'jour':'';
    const et=etat==='fait'?'<b>Faite</b>':etat==='jour'?'<b>Séance du jour</b>':etat==='eval'?'Évaluation':'À venir';
    const ouv=cyVu===J.c&&s.id===J.id;
    const mini=s.tl?`<div class="mini">${s.tl.map(x=>`<i style="flex:${x[1]}"></i>`).join('')}</div>`:'';
    return `<button type="button" class="sc ${etat}${ouv?' ouverte':''}" data-s="${s.id}"><span class="n">${esc(s.n)}</span><h3>${esc(s.title)}</h3><span class="et">${et}${ouv?' · ouverte ici':''}</span>${mini}</button>`;
  }).join('');
  panneau('gauche','Mes séances · '+CYC[cyVu].label,`${ORDRE.length>1?`<div class="cy">${ORDRE.map(k=>`<button type="button" data-cy="${k}" class="${cyVu===k?'on':''}">${NIV[k].label}</button>`).join('')}</div>`:''}<div class="grilleS">${cartes}</div>${cyVu===J.c&&CUR[cyVu]!==J.id?`<p class="aide" style="margin-top:14px"><b>${esc(sea(J.c,J.id).n)}</b> est ouverte ici. ${CUR[cyVu]?'La séance du jour est '+esc((sea(cyVu,CUR[cyVu])||{n:'une autre'}).n)+'.':'Aucune séance du jour n’est encore choisie.'} <button class="bt noir" type="button" data-jour="${J.id}" style="margin-left:6px">Faire de ${esc(sea(J.c,J.id).n)} la séance du jour</button></p>`:''}
   <p class="aide">Touche une séance pour l’afficher maintenant. Tournoi, banque, évaluation et les autres outils : bouton <b>Outils</b>, en bas de l’écran.</p>`,'Fermer');
  $('couche').querySelector('.pc').classList.add('niv-'+cyVu);
  $('couche').querySelectorAll('[data-cy]').forEach(x=>x.onclick=()=>{cyVu=x.dataset.cy;ouvrirSeances()});
  $('couche').querySelectorAll('[data-s]').forEach(x=>x.onclick=()=>{
    const s=sea(cyVu,x.dataset.s);
    if(!aEx(s)){location.href=lienOld(cyVu,s.id);return}
    if(cyVu===J.c&&s.id===J.id){fermer();return}
    const engagee=J.started&&!J.fin;
    if(engagee&&!confirm(`Passer à ${s.n} ? Le déroulé en cours de ${sea(J.c,J.id).n} sera remis à zéro.`))return;
    nouveau(cyVu,s.id);fermer();rendre();window.scrollTo({top:0});
  });
}
$('btAjuster').onclick=ouvrirAjuster;
$('btSeances').onclick=ouvrirSeances;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panneauOuvert){fermer();rendre()}});


/* ================== Outils ==================
   Tournoi, échauffements, banque, évaluation… : l'outil complet s'ouvre par-dessus l'écran de cours,
   sans en sortir (même appareil, mêmes données). Le minuteur de la séance continue. */
const OUTILS=APP.outils;
const urlOutil=(id,auto)=>APP.urlOutil(id,auto);
function ouvrirOutils(){
  panneauOuvert='outils';
  const G=OUTILS.slice().sort((a,b)=>(b.a&&J.c==='a')-(a.a&&J.c==='a'));
  const html=G.map(g=>`<h3 class="og">${esc(g.titre)}</h3><div class="tuiles">${g.items.map(t=>`<button type="button" data-outil="${t[0]}"${g.a?' data-auto="1"':''}><b>${esc(t[1])}</b><span>${esc(t[2])}</span></button>`).join('')}</div>`).join('');
  panneau('droite','Outils',html+'<p class="aide">L’outil s’ouvre par-dessus l’écran de cours : le minuteur continue. « Retour au cours » pour revenir.</p>','Fermer');
  $('couche').querySelectorAll('[data-outil]').forEach(x=>x.onclick=()=>voirOutil(x.dataset.outil,!!x.dataset.auto,x.querySelector('b').textContent));
}
let outilTic=null;
function voirOutil(id,auto,titre){
  fermer();
  const v=document.createElement('div');v.className='outil-v';v.setAttribute('role','dialog');v.setAttribute('aria-label',titre);
  v.innerHTML=`<div class="oh"><button class="bt noir" type="button" data-fo>‹ Retour au cours</button><b>${esc(titre)}</b><span class="ot num" id="oTemps"></span></div><iframe title="${esc(titre)}" src="${urlOutil(id,auto)}"></iframe>`;
  document.body.appendChild(v);document.body.classList.add('sous-outil');
  const maj=()=>{const el=$('oTemps');if(!el)return;const r=restant(),b=J.blocks[J.cur];el.textContent=(r==null||J.fin||!b)?'':`${titreBloc(b)} · ${r<0?'+':''}${mmss(r)}`};
  maj();clearInterval(outilTic);outilTic=setInterval(maj,1000);
  v.querySelector('[data-fo]').onclick=fermerOutil;
}
function fermerOutil(){const v=document.querySelector('.outil-v');if(!v)return;v.remove();document.body.classList.remove('sous-outil');clearInterval(outilTic);relireCur();rendre()}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('.outil-v'))fermerOutil()});
$('btOutils').onclick=ouvrirOutils;

/* ================== Séance du jour ==================
   Même réglage que dans l'outil complet (« Préparer ») : les deux restent d'accord. */
const marquerJour=(c,id)=>APP.marquerJour(c,id);
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-jour]');if(!b)return;
  const c=b.dataset.c||J.c,s=sea(c,b.dataset.jour);if(!s)return;marquerJour(c,s.id);toast(`${s.n} est la séance du jour`);
  if(panneauOuvert==='seances')ouvrirSeances();else rendre()});

/* ================== Raccourcis : l'outil dont le bloc a besoin ==================
   Ex. : bloc « montante-descendante » → « Ouvrir le tournoi ». Ouvert par-dessus le cours. */
const RACC=APP.racc;
function raccourcis(b,e){
  const typ=b.k==='warm'?'warm':(b.typ||b.k);
  const txt=e?[e.t,e.k,e.disp,e.four,e.cat,e.dispo,e.titre].concat(e.deroul||[]).filter(Boolean).join(' '):'';
  const ids=OUTILS.flatMap(g=>g.items.map(t=>t[0])),vus=new Set(),out=[];
  for(const [re,id,lab,auto] of RACC){if(out.length>=2)break;if(vus.has(id)||!ids.includes(id))continue;
    if(re.test(typ)||(txt&&!/^\^/.test(re.source)&&re.test(txt))){vus.add(id);out.push(`<button class="bt jaune" type="button" data-ov="${id}"${auto?' data-auto="1"':''}>${esc(lab)} ›</button>`)}}
  return out.length?`<div class="racc">${out.join('')}</div>`:'';
}

/* liens du texte (« fiche Échauffements »…) : ouverts par-dessus, comme les outils */
document.addEventListener('click',ev=>{const a=ev.target.closest('[data-ov]');if(!a)return;ev.preventDefault();
  const id=a.dataset.ov,g=OUTILS.find(g=>g.items.some(t=>t[0]===id)),t=g&&g.items.find(t=>t[0]===id);
  voirOutil(id,a.dataset.auto?true:(g?!!g.a:J.c==='a'),t?t[1]:a.textContent)});

rendre();
if(J.started&&!J.fin)eveil();
if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{})})}

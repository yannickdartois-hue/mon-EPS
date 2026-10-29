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
  bascule:s=>s&&s.bpm?`<button type="button" class="bascule" onclick="MUS.ouvrir('${esc(s.bpm)}')" title="Musique : tempo réglable, métronome, compteur de blocs">♪ ${esc(s.bpm)} BPM</button>`:''
};

/* ---------- Musique (hors ligne) : lecteur au tempo réglable sans changer la hauteur du son, métronome,
   décompte « 5, 6, 7, 8 » et compteur de temps (8 temps, blocs de 32). Les morceaux sont gardés sur l'iPad (IndexedDB). ---------- */
const MUS=(()=>{
  const DBN='step-musique',ST='pistes',PREF='step-musique-pref';
  let db=null,pistes=[],sel=null,cible=128,mode='metro',ouvert=false,petit=false,au=null,url=null,ac=null,run=false,raf=0,lock=null,taps=[],tSched=null,nb=0,tNext=0,t0=0,annonce=false;
  try{const p=JSON.parse(localStorage.getItem(PREF)||'{}');if(p.sel)sel=p.sel;if(p.mode)mode=p.mode;if(p.annonce)annonce=true}catch(e){}
  const pref=()=>{try{localStorage.setItem(PREF,JSON.stringify({sel,mode,annonce}))}catch(e){}};
  const idb=()=>db?Promise.resolve(db):new Promise((ok,ko)=>{const r=indexedDB.open(DBN,1);r.onupgradeneeded=()=>r.result.createObjectStore(ST,{keyPath:'id'});r.onsuccess=()=>ok(db=r.result);r.onerror=()=>ko(r.error)});
  const req=(m,f)=>idb().then(d=>new Promise((ok,ko)=>{const t=d.transaction(ST,m);const q=f(t.objectStore(ST));t.oncomplete=()=>ok(q&&q.result);t.onerror=()=>ko(t.error)}));
  const charger=()=>req('readonly',s=>s.getAll()).then(L=>{pistes=(L||[]).sort((a,b)=>a.nom.localeCompare(b.nom,'fr'))}).catch(()=>{pistes=[]});
  const piste=()=>pistes.find(p=>p.id===sel)||null;
  const beat=()=>60/cible;
  const ctxA=()=>{ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();return ac};
  function clic(t,fort,tresFort){const c=ctxA(),o=c.createOscillator(),g=c.createGain();o.frequency.value=tresFort?1500:fort?1100:800;g.gain.setValueAtTime(tresFort?.5:fort?.35:.2,t);g.gain.exponentialRampToValueAtTime(.001,t+.06);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+.07)}
  function dire(t){try{if(!window.speechSynthesis)return;const u=new SpeechSynthesisUtterance(t);u.lang='fr-FR';u.rate=1.3;speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){}}
  /* numéro du temps depuis le premier « 1 » */
  function temps(){if(!run)return null;
    if(mode==='metro'){const c=ctxA();return Math.floor((c.currentTime-t0)/beat())}
    const p=piste();if(!p||!p.bpm||!au)return null;return Math.floor((au.currentTime-(p.off||0))/(60/p.bpm))}
  function compteur(){const k=temps();const z=document.getElementById('mus-cpt');if(!z)return;
    if(k==null||k<0){z.innerHTML=k!=null&&k<0?`<b class="mus-t">${['5','6','7','8'][Math.min(3,4+k)]||''}</b><span>départ…</span>`:'<span class="mus-vide">—</span>';return}
    const t=k%8+1,h=Math.floor(k/8)%4+1,b=Math.floor(k/32)+1;
    z.innerHTML=`<b class="mus-t${t===1?' un':''}">${t}</b><span>8 temps <b>${h}</b> / 4</span><span class="mus-bl${h===1&&t<=2?' flash':''}">32 temps n° <b>${b}</b></span>`;
    if(annonce&&t===5&&h===4&&nb!==k){nb=k;dire('Bloc suivant')}}
  function boucle(){compteur();raf=requestAnimationFrame(boucle)}
  /* métronome : clics programmés à l'avance (précis même si l'écran est chargé) */
  function planifier(){const c=ctxA();while(tNext<c.currentTime+.15){const k=Math.round((tNext-t0)/beat());if(k<0){clic(tNext,true,false);if(k>=-4)setTimeout(()=>dire(['cinq','six','sept','huit'][4+k]),Math.max(0,(tNext-c.currentTime)*1000-80))}else clic(tNext,k%8===0,k%32===0);tNext+=beat()}}
  async function verrou(on){try{if(on&&navigator.wakeLock)lock=await navigator.wakeLock.request('screen');else if(lock){lock.release();lock=null}}catch(e){}}
  async function jouer(){if(run)return stop();
    if(mode==='metro'){const c=ctxA();t0=c.currentTime+4*beat()+.1;tNext=t0-4*beat();run=true;tSched=setInterval(planifier,25);planifier()}
    else{const p=piste();if(!p)return msg('Choisis d’abord un morceau (ou passe en métronome).');if(!p.bpm)return msg('Indique d’abord le tempo d’origine du morceau (tape-le ou écris-le).');
      if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(p.blob);au=new Audio(url);au.preservesPitch=true;au.mozPreservesPitch=true;au.webkitPreservesPitch=true;
      au.playbackRate=cible/p.bpm;au.onended=()=>stop();try{await au.play()}catch(e){return msg('Lecture impossible : touche encore Lecture.')}run=true}
    verrou(true);cancelAnimationFrame(raf);boucle();dessiner()}
  function stop(){run=false;clearInterval(tSched);tSched=null;if(au){au.pause();au=null}cancelAnimationFrame(raf);verrou(false);try{speechSynthesis.cancel()}catch(e){}dessiner()}
  function msg(t){const z=document.getElementById('mus-msg');if(z)z.textContent=t}
  async function ajouter(files){for(const f of files){const m=/(\d{2,3})\s*bpm/i.exec(f.name);const o={id:Math.random().toString(36).slice(2,10),nom:f.name.replace(/\.[^.]+$/,''),bpm:m?+m[1]:null,off:0,blob:f};
      try{await req('readwrite',s=>s.put(o));sel=o.id}catch(e){msg('Mémoire pleine : supprime un morceau.')}}
    await charger();pref();dessiner()}
  async function majPiste(ch){const p=piste();if(!p)return;Object.assign(p,ch);await req('readwrite',s=>s.put(p));dessiner()}
  function tap(){const n=performance.now();if(taps.length&&n-taps[taps.length-1]>2000)taps=[];taps.push(n);if(taps.length>9)taps.shift();
    if(taps.length>=4){const d=(taps[taps.length-1]-taps[0])/(taps.length-1);const b=Math.round(60000/d*2)/2;if(mode==='musique'){if(run&&au){/* pendant la lecture : on mesure le tempo entendu, on en déduit le tempo d'origine */majPiste({bpm:Math.round(b/(au.playbackRate||1)*2)/2})}else if(piste())majPiste({bpm:b})}else{cible=Math.round(b);dessiner()}}
    else msg('Continue à taper sur le temps ('+taps.length+')…')}
  function caler(){const p=piste();if(!p||!au||!run)return msg('Lance le morceau, puis touche « 1 » pile sur un début de phrase (le « 1 » après « 5, 6, 7, 8 »).');
    majPiste({off:au.currentTime});msg('Calé : le compteur repart de ce temps 1.')}
  function dessiner(){let z=document.getElementById('mus');if(!ouvert){if(z)z.hidden=true;return}
    if(!z){z=document.createElement('div');z.id='mus';document.body.appendChild(z)}z.hidden=false;
    const p=piste();
    if(petit){z.className='mus petit';z.innerHTML=`<button type="button" class="mus-b" data-mus="grand">♪ ${cible} BPM ${run?'· en cours':''}</button><div id="mus-cpt" class="mus-cpt mini"></div><button type="button" class="mus-b pri" data-mus="jouer">${run?'■':'▶'}</button>`;return}
    z.className='mus';
    z.innerHTML=`<div class="mus-h"><b>Musique</b><span class="sp"></span><button type="button" class="mus-b" data-mus="petit" title="Réduire">▾ Réduire</button><button type="button" class="mus-b" data-mus="fermer" title="Fermer (arrête la musique)">✕</button></div>
     <div class="mus-seg"><button type="button" class="${mode==='metro'?'on':''}" data-mus="mode" data-v="metro">Métronome</button><button type="button" class="${mode==='musique'?'on':''}" data-mus="mode" data-v="musique">Mes morceaux</button></div>
     ${mode==='musique'?`<div class="mus-l">${pistes.length?pistes.map(x=>`<button type="button" class="mus-p ${x.id===sel?'on':''}" data-mus="sel" data-v="${x.id}">${esc(x.nom)}<small>${x.bpm?x.bpm+' BPM d’origine':'tempo à indiquer'}</small></button>`).join(''):'<p class="mus-vide">Aucun morceau sur cet iPad. Ajoute des MP3 (de préférence phrasés en 32 temps).</p>'}</div>
       <div class="mus-row"><label class="mus-b">+ Ajouter des morceaux<input type="file" accept="audio/*" multiple hidden data-mus-file></label>${p?`<button type="button" class="mus-b" data-mus="suppr">Supprimer</button>`:''}</div>
       ${p?`<div class="mus-row"><span>Tempo d’origine</span><input class="mus-in" type="number" inputmode="decimal" min="60" max="200" step="0.5" value="${p.bpm||''}" data-mus-orig><button type="button" class="mus-b" data-mus="tap">Taper le tempo</button></div>`:''}`:''}
     <div class="mus-row mus-tempo"><span>Tempo de la classe</span><button type="button" class="mus-b" data-mus="moins">−</button><b>${cible} BPM</b><button type="button" class="mus-b" data-mus="plus">+</button>${mode==='metro'?'<button type="button" class="mus-b" data-mus="tap">Taper</button>':''}</div>
     ${mode==='musique'&&p&&p.bpm?`<p class="mus-note">Vitesse ×${(cible/p.bpm).toFixed(2).replace('.',',')} · la hauteur du son ne change pas${Math.abs(cible/p.bpm-1)>.12?' · <b>écart important : choisis un morceau plus proche</b>':''}</p>`:''}
     <div id="mus-cpt" class="mus-cpt"></div>
     <div class="mus-row"><button type="button" class="mus-b pri big" data-mus="jouer">${run?'■ Arrêter':mode==='metro'?'▶ Départ (5, 6, 7, 8)':'▶ Lecture'}</button>${mode==='musique'?'<button type="button" class="mus-b big" data-mus="caler" title="Pile sur un début de phrase">1 · caler le compteur</button>':''}</div>
     <label class="mus-chk"><input type="checkbox" data-mus-ann ${annonce?'checked':''}> Dire « bloc suivant » 4 temps avant chaque nouveau bloc de 32</label>
     <p id="mus-msg" class="mus-note"></p>`;
    compteur()}
  document.addEventListener('click',e=>{const b=e.target.closest('[data-mus]');if(!b)return;const a=b.dataset.mus,v=b.dataset.v;
    if(a==='fermer'){stop();ouvert=false;return dessiner()}
    if(a==='petit'){petit=true;return dessiner()}if(a==='grand'){petit=false;return dessiner()}
    if(a==='mode'){if(run)stop();mode=v;pref();return dessiner()}
    if(a==='sel'){if(run)stop();sel=v;pref();return dessiner()}
    if(a==='suppr'){const p=piste();if(!p||!confirm('Supprimer « '+p.nom+' » de cet iPad ?'))return;if(run)stop();req('readwrite',s=>s.delete(p.id)).then(charger).then(()=>{sel=null;pref();dessiner()});return}
    if(a==='moins'||a==='plus'){cible=Math.max(100,Math.min(160,cible+(a==='plus'?1:-1)));if(au&&piste()&&piste().bpm)au.playbackRate=cible/piste().bpm;if(run&&mode==='metro'){stop();}return dessiner()}
    if(a==='tap')return tap();
    if(a==='jouer')return jouer();
    if(a==='caler')return caler()});
  document.addEventListener('change',e=>{const t=e.target;
    if(t.matches('[data-mus-file]'))return ajouter([...t.files]);
    if(t.matches('[data-mus-orig]')){const v=parseFloat(String(t.value).replace(',','.'));if(v>=60&&v<=200)majPiste({bpm:v})}
    if(t.matches('[data-mus-ann]')){annonce=t.checked;pref()}});
  return {ouvrir(bpm){const m=/(\d{2,3})/.exec(String(bpm||''));if(m&&!run)cible=+m[1];ouvert=true;petit=false;charger().then(dessiner)}};
})();

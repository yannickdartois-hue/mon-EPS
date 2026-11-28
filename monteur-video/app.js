/* Monteur vidéo — MON EPS (Lycée Georges Pompidou)
   Fabrique sur l'appareil, sans réseau, une vidéo verticale de 2 min max :
   page de garde (logo de l'appli + titre), une scène par capture d'écran avec son texte, écran de fin.
   Musique sombre fabriquée ici (WebAudio, libre de droits) ou fichier personnel.
   Enregistrement : canvas.captureStream + MediaRecorder (MP4 sur iPhone/iPad et Chrome récent, sinon WebM).
   Tout reste sur l'appareil (IndexedDB). */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const MAX=120, FPS=30;
const APPS=[
 ['musculation-eleves','Musculation élève','#4d7c0f'],['cycle-musculation','Cycle musculation','#4d7c0f'],['musculation-prof','Musculation prof','#4d7c0f'],
 ['demi-fond-eleves','Demi-fond élève','#b91c1c'],['cycle-demi-fond','Cycle demi-fond','#b91c1c'],['demi-fond-prof','Demi-fond prof','#b91c1c'],
 ['carnet-step-','Step élève','#6d28d9'],['cycle-step','Cycle step','#6d28d9'],['carnet-step-prof','Step prof','#6d28d9'],
 ['cross-training-eleves','Cross training élève','#c2410c'],['cycle-cross-training','Cycle cross training','#c2410c'],['cross-training-prof','Cross training prof','#c2410c'],
 ['gym-eleves','Gym élève','#0f766e'],['cycle-gym','Cycle gym','#0f766e'],['gym-prof','Gym prof','#0f766e'],
 ['tennis-de-table-eleves','Tennis de table élève','#be185d'],['cycle-tennis-de-table','Cycle tennis de table','#be185d'],['tennis-de-table-prof','Tennis de table prof','#be185d'],
 ['badminton-eleves','Badminton élève','#0e7490'],['cycle-badminton','Cycle badminton','#0e7490'],['badminton-prof','Badminton prof','#0e7490'],
 ['volley-eleves','Volley élève','#1d4ed8'],['cycle-volley','Cycle volley','#1d4ed8'],
 ['cycle-danse','Cycle danse','#a21caf'],['mon-eps','MON EPS','#334155']
];
const ACT=[['Musculation','muscu'],['Demi-fond','demi-fond'],['Step','step'],['Cross training','cross'],['Gymnastique','gym'],['Tennis de table','tennis'],['Badminton','badminton'],['Volley-ball','volley'],['Danse','danse'],['Portail','mon-eps']];
const appDe=id=>APPS.find(a=>a[0]===id)||APPS[0];

/* ---------- stockage (IndexedDB) ---------- */
let db=null;
function ouvrirDB(){return new Promise(ok=>{try{const r=indexedDB.open('monteur-video',1);
  r.onupgradeneeded=()=>r.result.createObjectStore('projets',{keyPath:'id'});
  r.onsuccess=()=>{db=r.result;ok()};r.onerror=()=>ok()}catch(e){ok()}})}
function tx(mode){return db.transaction('projets',mode).objectStore('projets')}
function lireTous(){return new Promise(ok=>{if(!db)return ok([]);const r=tx('readonly').getAll();r.onsuccess=()=>ok(r.result||[]);r.onerror=()=>ok([])})}
let tSauve=0;
function sauver(){clearTimeout(tSauve);tSauve=setTimeout(()=>{if(!db)return;P.maj=Date.now();try{tx('readwrite').put(P)}catch(e){}},400)}
function effacer(id){return new Promise(ok=>{if(!db)return ok();const r=tx('readwrite').delete(id);r.onsuccess=r.onerror=()=>ok()})}

const nouveauP=()=>({id:'v'+Date.now(),app:'musculation-eleves',logo:null,titre:'',sous:'',fin:'Bonne séance !',sign:'Yannick Dartois',lycee:'Lycée Georges Pompidou · Castelnau-le-Lez',mus:'sombre',vol:55,musFi:null,musNom:'',q:'leger',scenes:[],maj:Date.now()});
let P=nouveauP(), LISTE=[];

/* ---------- images ---------- */
const IMG=new Map();   // Blob -> HTMLImageElement / ImageBitmap prêt
function imgDe(blob){if(!blob)return null;if(IMG.has(blob))return IMG.get(blob);
  const im=new Image();im.decoding='async';im.src=URL.createObjectURL(blob);IMG.set(blob,im);im.onload=()=>dessinerMinis();return im}
const pret=im=>im&&im.complete&&im.naturalWidth>0;
let logoIm=null;
function chargerLogo(){logoIm=new Image();logoIm.onload=()=>dessinerMinis();logoIm.onerror=()=>{logoIm=null};
  logoIm.src=P.logo?URL.createObjectURL(P.logo):'../icons/'+P.app+'.png'}
/* Une photo de téléphone peut faire 12 Mpx : on la réduit pour stocker et dessiner vite. */
function reduire(file){return new Promise(ok=>{const im=new Image();im.onload=()=>{const k=Math.min(1,1600/Math.max(im.naturalWidth,im.naturalHeight));
  if(k>=1&&file.size<1.5e6){URL.revokeObjectURL(im.src);return ok(file)}
  const c=document.createElement('canvas');c.width=Math.round(im.naturalWidth*k);c.height=Math.round(im.naturalHeight*k);
  c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(im.src);c.toBlob(b=>ok(b||file),'image/jpeg',0.9)};
  im.onerror=()=>ok(null);im.src=URL.createObjectURL(file)})}

/* ---------- durées ---------- */
const mots=s=>(s||'').replace(/\*\*/g,'').trim().split(/\s+/).filter(Boolean).length;
function plan(){
  const base=P.scenes.map(s=>s.duree||Math.min(15,Math.max(5,3+mots(s.titre)*0.3+mots(s.texte)*0.42)));
  const fixe=4.5+5; let somme=base.reduce((a,b)=>a+b,0), k=1;
  if(somme+fixe>MAX)k=(MAX-fixe)/somme;
  const items=[{k:'garde',d:4.5}];P.scenes.forEach((s,i)=>items.push({k:'ecran',i,d:Math.max(3,base[i]*k)}));items.push({k:'fin',d:5});
  let t=0;items.forEach(it=>{it.t=t;t+=it.d});return {items,total:t,serre:k<1,brut:somme+fixe};
}

/* ---------- dessin ---------- */
function teinte(hex,f){const n=parseInt(hex.slice(1),16),r=n>>16,g=n>>8&255,b=n&255;const m=f<0?0:255,a=Math.abs(f);
  return 'rgb('+[r,g,b].map(v=>Math.round(v+(m-v)*a)).join(',')+')'}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
const ease=p=>p<0?0:p>1?1:p*p*(3-2*p);
/* Texte avec retour à la ligne et **mots en jaune**. Renvoie la hauteur. */
function texte(c,str,x,y,w,taille,coul,opt){opt=opt||{};const lh=taille*(opt.lh||1.28),fam=opt.fam||'Atkinson',poids=opt.poids||400;
  const lignes=[];(str||'').split('\n').forEach(par=>{let gras=false;const toks=[];
    par.split(/(\*\*)/).forEach(seg=>{if(seg==='**'){gras=!gras;return}seg.split(/(\s+)/).forEach(m=>{if(m)toks.push({m,g:gras})})});
    let ligne=[],lw=0;for(const t of toks){c.font=(t.g?700:poids)+' '+taille+'px '+fam;const tw=c.measureText(t.m).width;
      if(/^\s+$/.test(t.m)){if(ligne.length){ligne.push({...t,w:tw});lw+=tw}continue}
      if(lw+tw>w&&ligne.length){while(ligne.length&&/^\s+$/.test(ligne[ligne.length-1].m))lw-=ligne.pop().w;lignes.push({l:ligne,w:lw});ligne=[];lw=0}
      ligne.push({...t,w:tw});lw+=tw}
    if(ligne.length)lignes.push({l:ligne,w:lw})});
  if(opt.mesure)return lignes.length*lh;
  c.textBaseline='alphabetic';
  lignes.forEach((L,i)=>{let xx=opt.centre?x+(w-L.w)/2:x;const yy=y+i*lh+taille;
    for(const t of L.l){c.font=(t.g?700:poids)+' '+taille+'px '+fam;c.fillStyle=t.g?(opt.gras||'#facc15'):coul;c.fillText(t.m,xx,yy);xx+=t.w}});
  return lignes.length*lh}

function fond(c,W,H,coul){const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,teinte(coul,-0.45));g.addColorStop(0.55,'#0d1117');g.addColorStop(1,'#070a0e');
  c.fillStyle=g;c.fillRect(0,0,W,H)}
const LAY=new WeakMap();
/* Dessine l'instant t (en s) de la vidéo. */
function dessiner(c,W,H,t,pl){
  const s=W/540, app=appDe(P.app), coul=app[2];
  const it=pl.items.find(x=>t>=x.t&&t<x.t+x.d)||pl.items[pl.items.length-1];
  const lt=t-it.t, p=lt/it.d;
  c.save();c.clearRect(0,0,W,H);fond(c,W,H,coul);
  if(it.k==='garde'||it.k==='fin'){
    const a=ease(lt/0.9), L=(it.k==='garde'?210:170)*s*(0.92+0.08*a), cy=(it.k==='garde'?250:200)*s;
    c.globalAlpha=a;
    // halo
    const hg=c.createRadialGradient(W/2,cy+L/2,10,W/2,cy+L/2,L*1.3);hg.addColorStop(0,teinte(coul,0.1));hg.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=hg;c.globalAlpha=a*0.55;c.fillRect(0,cy-L,W,L*3);c.globalAlpha=a;
    c.save();rr(c,(W-L)/2,cy,L,L,L*0.22);c.shadowColor='rgba(0,0,0,.6)';c.shadowBlur=30*s;c.fillStyle='#fff';c.fill();c.shadowBlur=0;c.clip();
    if(pret(logoIm))c.drawImage(logoIm,(W-L)/2,cy,L,L);else{c.fillStyle=coul;c.fillRect((W-L)/2,cy,L,L)}
    c.restore();
    let y=cy+L+44*s;
    if(it.k==='garde'){
      c.fillStyle='#cbd5e1';c.font='700 '+(22*s)+'px Archivo';c.textAlign='center';c.fillText(app[1].toUpperCase(),W/2,y);c.textAlign='left';y+=26*s;
      const b=ease((lt-0.4)/0.9);c.globalAlpha=b;
      y+=texte(c,P.titre||'Titre de la séance',40*s,y+(1-b)*20*s,W-80*s,46*s,'#ffffff',{fam:'Archivo',poids:800,centre:true,lh:1.15,gras:'#facc15'})+14*s;
      if(P.sous)texte(c,P.sous,40*s,y,W-80*s,26*s,'#cbd5e1',{centre:true});
      c.globalAlpha=a;c.fillStyle=coul;c.fillRect(W/2-40*s,H-118*s,80*s,5*s);
      c.fillStyle='#8b949e';c.font='400 '+(19*s)+'px Atkinson';c.textAlign='center';c.fillText('MON EPS · Lycée Georges Pompidou',W/2,H-80*s);c.textAlign='left';
    }else{
      y+=texte(c,P.fin||'Bonne séance !',40*s,y,W-80*s,44*s,'#ffffff',{fam:'Archivo',poids:800,centre:true,lh:1.15})+60*s;
      // signature : filet, nom, lycée, date
      const b=ease((lt-0.5)/0.8);c.globalAlpha=b;
      c.fillStyle=coul;c.fillRect(W/2-40*s,y,80*s,5*s);y+=46*s;c.textAlign='center';
      const sg=P.sign==null?'Yannick Dartois':P.sign, ly=P.lycee==null?'Lycée Georges Pompidou · Castelnau-le-Lez':P.lycee;
      if(sg){c.fillStyle='#ffffff';c.font='700 '+(30*s)+'px Archivo';c.fillText(sg,W/2,y);y+=38*s}
      c.textAlign='left';if(ly)y+=texte(c,ly,40*s,y-24*s,W-80*s,22*s,'#cbd5e1',{centre:true})-10*s;c.textAlign='center';
      c.fillStyle='#8b949e';c.font='400 '+(21*s)+'px Atkinson';c.fillText(new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}),W/2,y+28*s);c.textAlign='left';
    }
  }else{
    const sc=P.scenes[it.i];if(sc){
      const ap=ease(lt/0.6);
      // bandeau de texte
      const pad=30*s;let y=34*s;
      c.globalAlpha=ap;
      c.fillStyle=coul;rr(c,pad,y,92*s,34*s,17*s);c.fill();
      c.fillStyle='#fff';c.font='700 '+(18*s)+'px Archivo';c.textAlign='center';c.fillText((it.i+1)+' / '+P.scenes.length,pad+46*s,y+24*s);c.textAlign='left';
      c.font='700 '+(17*s)+'px Atkinson';c.fillStyle='#8b949e';c.fillText(app[1],pad+106*s,y+24*s);
      y+=50*s;
      if(sc.titre)y+=texte(c,sc.titre,pad,y,W-2*pad,34*s,'#ffffff',{fam:'Archivo',poids:800,lh:1.12})+6*s;
      if(sc.texte)y+=texte(c,sc.texte,pad,y,W-2*pad,25*s,'#e6edf3',{lh:1.3});
      y+=18*s;
      // capture
      const im=imgDe(sc.img);
      if(pret(im)){
        const rx=pad*0.7,rw=W-2*rx,rh=H-y-30*s,iw=im.naturalWidth,ih=im.naturalHeight;
        const z=sc.zoom==null?50:sc.zoom, cont=Math.min(rw/iw,rh/ih), wf=rw/iw;
        let k=z<=50?cont+(wf-cont)*(z/50):wf*(1+(z-50)/50);
        k*=1+0.045*ease(p);                                   // léger zoom lent
        const bw=Math.min(iw*k,rw),bh=Math.min(ih*k,rh),bx=rx+(rw-bw)/2,by=y+(z<=50&&ih*k<rh?(rh-bh)/4:0);
        const sw=bw/k,sh=bh/k,fx=sc.fx==null?0.5:sc.fx,fy=sc.fy==null?0:sc.fy;
        const sx=Math.max(0,Math.min(iw-sw,fx*iw-sw/2)),sy=Math.max(0,Math.min(ih-sh,fy*ih-sh/2));
        const sl=(1-ap)*40*s;
        c.save();rr(c,bx,by+sl,bw,bh,18*s);c.shadowColor='rgba(0,0,0,.55)';c.shadowBlur=24*s;c.fillStyle='#fff';c.fill();c.shadowBlur=0;c.clip();
        c.drawImage(im,sx,sy,sw,sh,bx,by+sl,bw,bh);c.restore();
        c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=2*s;rr(c,bx,by+sl,bw,bh,18*s);c.stroke();
        LAY.set(c,{bx,by,bw,bh,sx,sy,sw,sh,iw,ih});
      }
    }
  }
  // fondu au noir entre deux scènes
  const f=Math.min(lt,it.d-lt), fd=0.35;
  if(f<fd){c.globalAlpha=1-f/fd;c.fillStyle='#000';c.fillRect(0,0,W,H)}
  c.restore();return it;
}

/* ---------- musique sombre (fabriquée, déterministe) ---------- */
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const hz=m=>440*Math.pow(2,(m-69)/12);
function musiqueSombre(ac,out,t0,D){
  const R=rng(7), bus=ac.createGain(), lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1400;
  const comp=ac.createDynamicsCompressor();bus.connect(lp);lp.connect(comp);comp.connect(out);
  bus.gain.setValueAtTime(0,t0);bus.gain.linearRampToValueAtTime(1,t0+3);bus.gain.setValueAtTime(1,t0+Math.max(3.1,D-3.5));bus.gain.linearRampToValueAtTime(0,t0+D);
  // écho
  const dl=ac.createDelay(2),fb=ac.createGain(),wet=ac.createGain();dl.delayTime.value=0.75;fb.gain.value=0.38;wet.gain.value=0.5;dl.connect(fb);fb.connect(dl);dl.connect(wet);wet.connect(bus);
  // nappe : la mineur → fa → ré mineur → mi
  const ACC=[[45,52,57,60],[41,48,53,57],[38,45,50,53],[40,47,52,56]], PER=8;
  for(let i=0;i*PER<D;i++){const a=ACC[i%4],ts=t0+i*PER,te=Math.min(t0+D,ts+PER+1.5);
    a.forEach((m,j)=>{[-6,6].forEach(det=>{const o=ac.createOscillator(),g=ac.createGain(),f=ac.createBiquadFilter();
      o.type=j===0?'triangle':'sawtooth';o.frequency.value=hz(m);o.detune.value=det;f.type='lowpass';f.frequency.setValueAtTime(320,ts);f.frequency.linearRampToValueAtTime(700,ts+PER/2);f.frequency.linearRampToValueAtTime(320,te);
      const v=j===0?0.05:0.022;g.gain.setValueAtTime(0,ts);g.gain.linearRampToValueAtTime(v,ts+2.2);g.gain.setValueAtTime(v,te-1.6);g.gain.linearRampToValueAtTime(0,te);
      o.connect(f);f.connect(g);g.connect(bus);o.start(ts);o.stop(te+0.05)})})}
  // basse continue
  const sub=ac.createOscillator(),sg=ac.createGain();sub.type='sine';sub.frequency.value=hz(33);sg.gain.value=0.16;sub.connect(sg);sg.connect(bus);sub.start(t0);sub.stop(t0+D);
  // pulsation grave lente (cœur), à partir de 4 s
  for(let t=4;t<D-2;t+=2){const o=ac.createOscillator(),g=ac.createGain(),ts=t0+t;o.type='sine';o.frequency.setValueAtTime(68,ts);o.frequency.exponentialRampToValueAtTime(38,ts+0.5);
    g.gain.setValueAtTime(0.0001,ts);g.gain.exponentialRampToValueAtTime(0.32,ts+0.02);g.gain.exponentialRampToValueAtTime(0.0001,ts+0.9);o.connect(g);g.connect(bus);o.start(ts);o.stop(ts+1)}
  // notes de cloche éparses (penta mineure)
  const PEN=[69,72,74,76,79,81];
  for(let t=6;t<D-3;t+=3+Math.floor(R()*3)){const o=ac.createOscillator(),g=ac.createGain(),ts=t0+t;o.type='sine';o.frequency.value=hz(PEN[Math.floor(R()*PEN.length)]);
    g.gain.setValueAtTime(0.0001,ts);g.gain.exponentialRampToValueAtTime(0.045,ts+0.01);g.gain.exponentialRampToValueAtTime(0.0001,ts+2.4);o.connect(g);g.connect(bus);g.connect(dl);o.start(ts);o.stop(ts+2.5)}
  // souffle
  const nb=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate),d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=R()*2-1;
  const ns=ac.createBufferSource(),bp=ac.createBiquadFilter(),ng=ac.createGain(),lfo=ac.createOscillator(),lg=ac.createGain();
  ns.buffer=nb;ns.loop=true;bp.type='bandpass';bp.frequency.value=500;bp.Q.value=0.8;ng.gain.value=0.018;lfo.frequency.value=0.07;lg.gain.value=300;lfo.connect(lg);lg.connect(bp.frequency);
  ns.connect(bp);bp.connect(ng);ng.connect(bus);ns.start(t0);ns.stop(t0+D);lfo.start(t0);lfo.stop(t0+D);
}
let BUF=null,BUFde=null;
async function tampon(ac){if(!P.musFi)return null;if(BUFde===P.musFi&&BUF)return BUF;
  try{const ab=await P.musFi.arrayBuffer();BUF=await new Promise((ok,ko)=>ac.decodeAudioData(ab,ok,ko));BUFde=P.musFi;return BUF}catch(e){return null}}
async function lancerMusique(ac,out,D){
  const g=ac.createGain();g.gain.value=Math.pow(P.vol/100,1.6)*1.4;g.connect(out);const t0=ac.currentTime+0.15;
  if(P.mus==='sombre')musiqueSombre(ac,g,t0,D);
  else if(P.mus==='fichier'){const b=await tampon(ac);if(b){const s=ac.createBufferSource(),f=ac.createGain();s.buffer=b;s.loop=true;s.connect(f);f.connect(g);
    f.gain.setValueAtTime(0,t0);f.gain.linearRampToValueAtTime(1,t0+1.5);f.gain.setValueAtTime(1,t0+Math.max(1.6,D-3));f.gain.linearRampToValueAtTime(0,t0+D);s.start(t0);s.stop(t0+D+0.1)}}
  return t0}

/* ---------- lecture / enregistrement ---------- */
let enCours=null;
function choisirType(){if(!window.MediaRecorder)return null;
  const L=['video/mp4;codecs="avc1.42E01E, mp4a.40.2"','video/mp4;codecs=avc1,mp4a.40.2','video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  for(const t of L){try{if(MediaRecorder.isTypeSupported(t))return t}catch(e){}}return ''}
async function jouer(enregistrer){
  if(enCours)return;
  if(!P.scenes.length&&enregistrer){alert('Ajoute au moins une capture d’écran.');return}
  const pl=plan(),D=pl.total,cv=$('cv'),bonne=P.q==='bonne';
  cv.width=bonne?720:540;cv.height=bonne?1280:960;const c=cv.getContext('2d');
  $('scene').classList.add('on');$('info').textContent=enregistrer?'Préparation…':'Aperçu';$('prog').style.width='0';
  try{await document.fonts.load('800 40px Archivo');await document.fonts.load('400 20px Atkinson');await document.fonts.load('700 20px Atkinson')}catch(e){}
  await Promise.all(P.scenes.map(s=>{const im=imgDe(s.img);return pret(im)||!im?0:new Promise(r=>{im.addEventListener('load',r,{once:true});im.addEventListener('error',r,{once:true});setTimeout(r,3000)})}));
  const AC=window.AudioContext||window.webkitAudioContext,ac=new AC();try{await ac.resume()}catch(e){}
  const dest=ac.createMediaStreamDestination?ac.createMediaStreamDestination():null;
  const sortie=ac.createGain();sortie.connect(ac.destination);if(dest)sortie.connect(dest);
  let rec=null,morceaux=[],type='';
  if(enregistrer){type=choisirType();if(type===null||!cv.captureStream){ac.close();$('scene').classList.remove('on');
      alert('Cet appareil ne sait pas enregistrer de vidéo. Ouvre l’outil dans Safari (iPhone, iPad) ou Chrome.');return}
    const vs=cv.captureStream(FPS),pistes=[...vs.getVideoTracks()];if(dest&&P.mus!=='aucune')pistes.push(...dest.stream.getAudioTracks());
    const o={videoBitsPerSecond:bonne?1500000:330000,audioBitsPerSecond:bonne?128000:48000};if(type)o.mimeType=type;
    try{rec=new MediaRecorder(new MediaStream(pistes),o)}catch(e){try{rec=new MediaRecorder(new MediaStream(pistes))}catch(e2){ac.close();$('scene').classList.remove('on');alert('Enregistrement impossible : '+e2.message);return}}
    type=rec.mimeType||type||'video/webm';rec.ondataavailable=e=>{if(e.data&&e.data.size)morceaux.push(e.data)}}
  let verrou=null;try{verrou=await navigator.wakeLock.request('screen')}catch(e){}
  dessiner(c,cv.width,cv.height,0,pl);
  const t0=await lancerMusique(ac,sortie,D);
  if(rec)rec.start(1000);
  const st={stop:false};enCours=st;
  await new Promise(fini=>{
    const pas=()=>{const t=Math.max(0,ac.currentTime-t0);
      if(st.stop||t>=D){dessiner(c,cv.width,cv.height,Math.min(t,D-0.01),pl);return fini()}
      dessiner(c,cv.width,cv.height,t,pl);$('prog').style.width=(100*t/D)+'%';
      $('info').textContent=(enregistrer?'🔴 Enregistrement… ':'Aperçu · ')+Math.floor(t)+' / '+Math.round(D)+' s';
      requestAnimationFrame(pas)};
    requestAnimationFrame(pas)});
  const arrete=st.stop;enCours=null;
  let blob=null;
  if(rec){await new Promise(r=>{rec.onstop=r;try{rec.requestData()}catch(e){}rec.stop()});blob=new Blob(morceaux,{type:type.split(';')[0]})}
  try{verrou&&verrou.release()}catch(e){}try{ac.close()}catch(e){}
  $('scene').classList.remove('on');
  if(blob&&!arrete)resultat(blob,D);
}
function resultat(blob,D){
  const mp4=/mp4/.test(blob.type),ext=mp4?'mp4':'webm',mo=(blob.size/1048576).toFixed(1).replace('.',',');
  const nom=('MonEPS_'+appDe(P.app)[1]+'_'+(P.titre||'seance')).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\w]+/g,'_').replace(/_+$/,'').slice(0,70)+'.'+ext;
  const url=URL.createObjectURL(blob),f=new File([blob],nom,{type:blob.type});
  const partage=navigator.canShare&&navigator.canShare({files:[f]});
  $('res').innerHTML='<div class="ok">✅ Vidéo prête : <b>'+Math.round(D)+' s</b> · <b>'+mo+' Mo</b> · '+ext.toUpperCase()+'</div>'+
    (mp4?'':'<p class="att">Format WebM : il ne se lit pas sur tous les iPhone. Pour un MP4, crée la vidéo depuis Safari (iPhone, iPad) ou un Chrome à jour.</p>')+
    (blob.size>8e6&&P.q==='leger'?'<p class="att">Fichier un peu lourd pour Pronote : raccourcis les textes ou enlève une capture.</p>':'')+
    '<video controls playsinline src="'+url+'"></video>'+
    '<div class="row"><a class="bt p" id="dl" href="'+url+'" download="'+nom+'">⬇ Télécharger</a>'+(partage?'<button id="part">📤 Partager / Enregistrer</button>':'')+'</div>'+
    '<p class="aide">Sur iPhone / iPad : « Partager » puis « Enregistrer dans Fichiers », puis joins le fichier dans Pronote. Nom : '+nom+'</p>';
  if(partage)$('part').onclick=()=>navigator.share({files:[f],title:P.titre||'Vidéo EPS'}).catch(()=>{});
  $('res').scrollIntoView({behavior:'smooth',block:'start'});
}

/* ---------- écouter la musique ---------- */
let ecoute=null;
async function ecouter(){if(ecoute){try{ecoute.close()}catch(e){}ecoute=null;$('ecoute').textContent='▶ Écouter 10 s';return}
  if(P.mus==='aucune')return;const AC=window.AudioContext||window.webkitAudioContext,ac=new AC();ecoute=ac;try{await ac.resume()}catch(e){}
  $('ecoute').textContent='■ Arrêter';await lancerMusique(ac,ac.destination,10);
  setTimeout(()=>{if(ecoute===ac){ac.close();ecoute=null;$('ecoute').textContent='▶ Écouter 10 s'}},10500)}

/* ---------- capture en grand ---------- */
let GI=0;
function ouvrirGrand(i){if(i<0||i>=P.scenes.length)return;GI=i;const s=P.scenes[i];
  $('gNum').textContent='Écran '+(i+1)+' / '+P.scenes.length;$('gPrec').disabled=i===0;$('gSuiv').disabled=i===P.scenes.length-1;
  const im=imgDe(s.img);$('gImg').src=im?im.src:'';$('gTitre').value=s.titre||'';$('gTexte').value=s.texte||'';
  $('grand').classList.add('on');document.body.style.overflow='hidden';$('gImgBox').scrollTop=0;
  $('gImg').onload=placerPt;placerPt()}
function placerPt(){const s=P.scenes[GI],im=$('gImg'),pt=$('gPt');if(!s||!im.naturalWidth)return;
  pt.style.left=(im.offsetLeft+(s.fx==null?0.5:s.fx)*im.offsetWidth)+'px';pt.style.top=(im.offsetTop+(s.fy==null?0:s.fy)*im.offsetHeight)+'px'}
function fermerGrand(){$('grand').classList.remove('on');document.body.style.overflow='';$('gZone').checked=false;$('gImgBox').classList.remove('zone');rendreEcrans()}

/* ---------- interface ---------- */
const esc=s=>(s||'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
function rendreApps(){
  const grp=a=>{const i=ACT.findIndex(x=>a[0].includes(x[1])||a[1].toLowerCase().includes(x[0].toLowerCase()));return i<0?ACT.length-1:i};
  $('appSel').innerHTML=ACT.map((g,gi)=>{const L=APPS.filter(a=>grp(a)===gi);return L.length?'<optgroup label="'+g[0]+'">'+L.map(a=>'<option value="'+a[0]+'"'+(a[0]===P.app?' selected':'')+'>'+esc(a[1])+'</option>').join('')+'</optgroup>':''}).join('');
  $('logoVu').src=P.logo?URL.createObjectURL(P.logo):'../icons/'+P.app+'.png';
  $('logoBt').textContent=P.logo?'↺ Reprendre le logo de l’appli':'🖼 Mettre mon propre logo'}
function rendreProjets(){$('projets').innerHTML=LISTE.slice().sort((a,b)=>b.maj-a.maj).map(p=>'<option value="'+p.id+'"'+(p.id===P.id?' selected':'')+'>'+esc(p.titre||'Vidéo sans titre')+' · '+esc(appDe(p.app)[1])+'</option>').join('')||'<option>Nouvelle vidéo</option>'}
function rendreEcrans(){
  const pl=plan();
  $('ecrans').innerHTML=P.scenes.map((s,i)=>{const it=pl.items[i+1];return '<div class="ecr" data-i="'+i+'"><canvas width="270" height="480" data-cv="'+i+'" aria-label="Aperçu, touche pour ouvrir en grand" role="button"></canvas><div>'+
    '<div class="t"><span>Écran '+(i+1)+'</span><span class="dur">'+(s.duree?'⏱ ':'')+it.d.toFixed(1).replace('.',',')+' s</span></div>'+
    '<label>Titre de l’étape</label><input type="text" data-f="titre" value="'+esc(s.titre)+'" placeholder="Ex. Je règle ma charge">'+
    '<label>Explication (1 ou 2 phrases)</label><textarea data-f="texte" placeholder="Ex. Je fais **10 répétitions** propres, pas une de plus.">'+esc(s.texte)+'</textarea>'+
    '<label>Zoom sur la capture</label><input type="range" min="0" max="100" step="5" data-f="zoom" value="'+(s.zoom==null?50:s.zoom)+'">'+
    '<div class="mini"><button data-a="haut" '+(i?'':'disabled')+' aria-label="Monter">▲</button><button data-a="bas" '+(i<P.scenes.length-1?'':'disabled')+' aria-label="Descendre">▼</button>'+
    '<button data-a="moins">− 1 s</button><button data-a="plus">+ 1 s</button>'+(s.duree?'<button data-a="auto">Durée auto</button>':'')+'<button data-a="suppr" aria-label="Supprimer">🗑</button></div></div></div>'}).join('');
  dessinerMinis();majTotal();
}
function dessinerMinis(){const pl=plan();document.querySelectorAll('canvas[data-cv]').forEach(cv=>{const i=+cv.dataset.cv,it=pl.items[i+1];if(!it)return;
  dessiner(cv.getContext('2d'),cv.width,cv.height,it.t+it.d*0.5,pl)})}
function majTotal(){const pl=plan();$('tot').textContent=Math.floor(pl.total/60)+' min '+String(Math.round(pl.total%60)).padStart(2,'0')+' s';
  $('tot').classList.toggle('trop',pl.serre);
  $('tot').title=pl.serre?'Textes longs : la vidéo est resserrée à 2 min ('+Math.round(pl.brut)+' s demandées).':'';
  document.querySelectorAll('.ecr').forEach(e=>{const i=+e.dataset.i,s=P.scenes[i],d=pl.items[i+1].d;e.querySelector('.dur').textContent=(s.duree?'⏱ ':'')+d.toFixed(1).replace('.',',')+' s'+(pl.serre?' (resserré)':'')})}
function rendreTout(){rendreProjets();rendreApps();$('titre').value=P.titre;$('sous').value=P.sous;$('fin').value=P.fin;$('sign').value=P.sign==null?'Yannick Dartois':P.sign;$('lycee').value=P.lycee==null?'Lycée Georges Pompidou · Castelnau-le-Lez':P.lycee;
  document.querySelectorAll('[name=mus]').forEach(r=>r.checked=r.value===P.mus);document.querySelectorAll('[name=q]').forEach(r=>r.checked=r.value===P.q);
  $('vol').value=P.vol;$('musNom').textContent=P.musNom||'';$('fichRow').style.display=P.mus==='fichier'?'':'none';$('res').innerHTML='';chargerLogo();rendreEcrans()}

function brancher(){
  $('appSel').onchange=e=>{P.app=e.target.value;P.logo=null;sauver();rendreApps();chargerLogo();rendreProjets()};
  $('logoBt').onclick=()=>{if(P.logo){P.logo=null;sauver();rendreApps();chargerLogo()}else $('logoFi').click()};
  $('logoFi').onchange=async e=>{const f=e.target.files[0];if(!f)return;P.logo=await reduire(f);sauver();rendreApps();chargerLogo();e.target.value=''};
  [['titre','titre'],['sous','sous'],['fin','fin'],['sign','sign'],['lycee','lycee']].forEach(([id,k])=>$(id).addEventListener('input',e=>{P[k]=e.target.value;sauver();if(k==='titre')rendreProjets()}));
  $('ajout').onclick=()=>$('ajoutFi').click();
  $('ajoutFi').onchange=async e=>{const fs=[...e.target.files].sort((a,b)=>a.lastModified-b.lastModified||a.name.localeCompare(b.name));e.target.value='';
    for(const f of fs){const b=await reduire(f);if(b)P.scenes.push({img:b,titre:'',texte:'',zoom:50,fx:0.5,fy:0,duree:null})}sauver();rendreEcrans()};
  const E=$('ecrans');
  E.addEventListener('input',e=>{const el=e.target,box=el.closest('.ecr');if(!box||!el.dataset.f)return;const s=P.scenes[+box.dataset.i];
    s[el.dataset.f]=el.dataset.f==='zoom'?+el.value:el.value;sauver();majTotal();dessinerMinis()});
  E.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;const i=+b.closest('.ecr').dataset.i,S=P.scenes,a=b.dataset.a,pl=plan();
    if(a==='haut'&&i>0)[S[i-1],S[i]]=[S[i],S[i-1]];
    else if(a==='bas'&&i<S.length-1)[S[i+1],S[i]]=[S[i],S[i+1]];
    else if(a==='plus'||a==='moins')S[i].duree=Math.max(3,Math.min(20,Math.round((S[i].duree||pl.items[i+1].d)+(a==='plus'?1:-1))));
    else if(a==='auto')S[i].duree=null;
    else if(a==='suppr'){if(!confirm('Retirer cet écran ?'))return;S.splice(i,1)}
    sauver();rendreEcrans()});
  /* toucher l'aperçu = ouvrir la capture en grand */
  E.addEventListener('click',e=>{const cv=e.target.closest('canvas[data-cv]');if(cv)ouvrirGrand(+cv.dataset.cv)});
  $('gFerm').onclick=fermerGrand;$('gPrec').onclick=()=>ouvrirGrand(GI-1);$('gSuiv').onclick=()=>ouvrirGrand(GI+1);
  $('gZone').onchange=e=>{$('gImgBox').classList.toggle('zone',e.target.checked);placerPt()};
  $('gTitre').oninput=e=>{P.scenes[GI].titre=e.target.value;sauver()};
  $('gTexte').oninput=e=>{P.scenes[GI].texte=e.target.value;sauver()};
  $('gImg').addEventListener('click',e=>{if(!$('gZone').checked)return;const r=e.target.getBoundingClientRect(),s=P.scenes[GI];
    s.fx=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));s.fy=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));sauver();placerPt()});
  addEventListener('keydown',e=>{if(e.key==='Escape'&&$('grand').classList.contains('on'))fermerGrand()});
  document.querySelectorAll('[name=mus]').forEach(r=>r.onchange=()=>{P.mus=r.value;$('fichRow').style.display=P.mus==='fichier'?'':'none';sauver();if(P.mus==='fichier'&&!P.musFi)$('musFi').click()});
  document.querySelectorAll('[name=q]').forEach(r=>r.onchange=()=>{P.q=r.value;sauver()});
  $('vol').oninput=e=>{P.vol=+e.target.value;sauver()};
  $('musBt').onclick=()=>$('musFi').click();
  $('musFi').onchange=e=>{const f=e.target.files[0];if(!f)return;P.musFi=f;P.musNom=f.name;$('musNom').textContent=f.name;sauver();e.target.value=''};
  $('ecoute').onclick=ecouter;
  $('apercu').onclick=()=>jouer(false);$('creer').onclick=()=>jouer(true);
  $('stop').onclick=()=>{if(enCours)enCours.stop=true};
  $('nouveau').onclick=()=>{P=nouveauP();LISTE.push(P);sauver();rendreTout()};
  $('suppr').onclick=async()=>{if(!confirm('Supprimer cette vidéo de l’appareil ?'))return;await effacer(P.id);LISTE=LISTE.filter(p=>p.id!==P.id);
    P=LISTE.sort((a,b)=>b.maj-a.maj)[0]||nouveauP();if(!LISTE.includes(P))LISTE.push(P);rendreTout()};
  $('projets').onchange=e=>{const p=LISTE.find(x=>x.id===e.target.value);if(p){P=p;rendreTout()}};
  addEventListener('eps-avant-maj',()=>{clearTimeout(tSauve);if(db)try{tx('readwrite').put(P)}catch(e){}});
  addEventListener('pagehide',()=>{if(db)try{tx('readwrite').put(P)}catch(e){}});
}
(async()=>{await ouvrirDB();LISTE=await lireTous();P=LISTE.sort((a,b)=>b.maj-a.maj)[0]||nouveauP();if(!LISTE.includes(P))LISTE.push(P);brancher();rendreTout();
  document.fonts&&document.fonts.ready.then(dessinerMinis)})();
window.MONTEUR={plan,get P(){return P}};
})();

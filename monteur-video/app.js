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
  const base=P.scenes.map(s=>s.duree||Math.min(16,Math.max(s.type==='texte'?6:5,(s.type==='texte'?2:3)+mots(s.titre)*0.3+mots(s.texte)*0.42)));
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
  const lignes=[];(str||'').replace(/->/g,'→').split('\n').forEach(par=>{par=par.replace(/^\s*[-•]\s+/,'•  ');let gras=false;const toks=[];c.font=poids+' '+taille+'px '+fam;const ind=par.startsWith('•  ')?c.measureText('•  ').width:0;
    par.split(/(\*\*)/).forEach(seg=>{if(seg==='**'){gras=!gras;return}seg.split(/(\s+)/).forEach(m=>{if(m)toks.push({m,g:gras})})});
    let ligne=[],lw=0;for(const t of toks){c.font=(t.g?700:poids)+' '+taille+'px '+fam;const tw=c.measureText(t.m).width;
      if(/^\s+$/.test(t.m)){if(ligne.length){ligne.push({...t,w:tw});lw+=tw}continue}
      if(lw+tw>w-(lignes.length&&lignes[lignes.length-1].p===par?ind:0)&&ligne.length){while(ligne.length&&/^\s+$/.test(ligne[ligne.length-1].m))lw-=ligne.pop().w;const prem=!(lignes.length&&lignes[lignes.length-1].p===par);lignes.push({l:ligne,w:lw,p:par,ind:prem?0:ind});ligne=[];lw=0}
      ligne.push({...t,w:tw});lw+=tw}
    if(ligne.length){const prem=!(lignes.length&&lignes[lignes.length-1].p===par);lignes.push({l:ligne,w:lw,p:par,ind:prem?0:ind})}});
  if(opt.mesure)return lignes.length*lh;
  c.textBaseline='alphabetic';
  lignes.forEach((L,i)=>{let xx=(opt.centre?x+(w-L.w)/2:x)+(L.ind||0);const yy=y+i*lh+taille;
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
    const sc=P.scenes[it.i];
    if(sc&&sc.type==='texte')ecranTexte(c,W,H,s,sc,lt,app);
    else if(sc){
      const ap=ease(lt/0.6),caps=P.scenes.filter(x=>x.type!=='texte'),num=caps.indexOf(sc)+1;
      const pad=30*s;let y=30*s;
      c.globalAlpha=ap;
      // « ③ sur 10 »
      c.fillStyle='#fff';c.beginPath();c.arc(pad+26*s,y+26*s,26*s,0,7);c.fill();
      c.fillStyle=teinte(coul,-0.25);c.font='900 '+(28*s)+'px Archivo';c.textAlign='center';c.fillText(num,pad+26*s,y+36*s);c.textAlign='left';
      c.fillStyle=teinte(coul,0.72);c.font='800 '+(19*s)+'px Archivo';c.fillText(('sur '+caps.length).toUpperCase(),pad+64*s,y+33*s);
      y+=66*s;
      if(sc.titre)y+=texte(c,sc.titre,pad,y,W-2*pad,38*s,'#ffffff',{fam:'Archivo',poids:800,lh:1.08})+8*s;
      if(sc.texte)y+=texte(c,sc.texte,pad,y,W-2*pad,27*s,'#f0fdf4',{lh:1.28});
      y+=20*s;
      const im=imgDe(sc.img);
      if(pret(im)){
        const cad=10*s;                                   // épaisseur du cadre de téléphone
        const rx=pad*0.8+cad,rw=W-2*rx,rh=H-y-26*s-2*cad,iw=im.naturalWidth,ih=im.naturalHeight;
        const z=sc.zoom==null?50:sc.zoom, cont=Math.min(rw/iw,rh/ih), wf=rw/iw;
        let k=z<=50?cont+(wf-cont)*(z/50):wf*(1+(z-50)/50);
        k*=1+0.035*ease(p);
        const bw=Math.min(iw*k,rw),bh=Math.min(ih*k,rh),bx=rx+(rw-bw)/2,by=y+cad;
        const sw=bw/k,sh=bh/k,fx=sc.fx==null?0.5:sc.fx,fy=sc.fy==null?0:sc.fy;
        const sx=Math.max(0,Math.min(iw-sw,fx*iw-sw/2)),sy=Math.max(0,Math.min(ih-sh,fy*ih-sh/2));
        const sl=(1-ap)*40*s,ouvert=bh>=rh-1;           // capture coupée en bas = le téléphone continue sous l'écran
        c.save();c.shadowColor='rgba(0,0,0,.6)';c.shadowBlur=30*s;c.fillStyle='#111418';
        rr(c,bx-cad,by-cad+sl,bw+2*cad,bh+2*cad+(ouvert?60*s:0),34*s);c.fill();c.restore();
        c.save();rr(c,bx,by+sl,bw,bh,24*s);c.clip();c.fillStyle='#fff';c.fillRect(bx,by+sl,bw,bh);
        c.drawImage(im,sx,sy,sw,sh,bx,by+sl,bw,bh);c.restore();
        LAY.set(c,{bx,by,bw,bh,sx,sy,sw,sh,iw,ih});
        if(sc.mk&&sc.mk.k){const mx=bx+(sc.mk.x*iw-sx)*bw/sw,my=by+sl+(sc.mk.y*ih-sy)*bh/sh;
          if(mx>bx&&mx<bx+bw&&my>by&&my<by+bh)repere(c,mx,my,sc.mk.k,lt,s)}
      }
    }
  }
  // fondu au noir entre deux scènes
  const f=Math.min(lt,it.d-lt), fd=0.35;
  if(f<fd){c.globalAlpha=1-f/fd;c.fillStyle='#000';c.fillRect(0,0,W,H)}
  c.restore();return it;
}

/* Écran de texte seul : « C'est quoi ? » ou « ⚠️ Sécurité ». */
function ecranTexte(c,W,H,s,sc,lt,app){
  const secu=sc.style==='secu',a=ease(lt/0.7),pad=46*s;
  if(secu){const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#7f1d1d');g.addColorStop(0.6,'#2a0a0a');g.addColorStop(1,'#120505');c.fillStyle=g;c.fillRect(0,0,W,H)}
  const lab=(sc.rub||(secu?'Sécurité':'')).toUpperCase(),fam={fam:'Archivo',poids:900,lh:1.02};
  // hauteur totale pour centrer
  let h=(lab?62*s:0)+texte(c,sc.titre||' ',pad,0,W-2*pad,58*s,'#fff',{...fam,mesure:1})+22*s+texte(c,sc.texte||'',pad,0,W-2*pad,30*s,'#fff',{lh:1.3,mesure:1});
  let y=Math.max(70*s,(H-h)/2-30*s)+(1-a)*24*s;c.globalAlpha=a;
  if(lab){let x=pad;
    if(secu){c.fillStyle='#facc15';c.beginPath();c.moveTo(x+20*s,y+2*s);c.lineTo(x+41*s,y+38*s);c.lineTo(x-1*s,y+38*s);c.closePath();c.fill();
      c.fillStyle='#1c2128';c.font='900 '+(26*s)+'px Archivo';c.textAlign='center';c.fillText('!',x+20*s,y+34*s);c.textAlign='left';x+=54*s}
    c.fillStyle=secu?'#fecaca':teinte(appDe(P.app)[2],0.72);c.font='800 '+(26*s)+'px Archivo';c.fillText(lab,x,y+32*s);y+=62*s}
  y+=texte(c,sc.titre||'',pad,y,W-2*pad,58*s,'#ffffff',fam)+22*s;
  texte(c,sc.texte||'',pad,y,W-2*pad,30*s,'#fef2f2',{lh:1.3,gras:'#fef08a'});
}
/* Rond ou flèche jaune qui montre où toucher (apparaît après 1 s, pulse doucement). */
function repere(c,x,y,k,lt,s){const a=ease((lt-1)/0.4);if(a<=0)return;const pu=Math.sin(lt*4.2);
  c.save();c.globalAlpha=a;c.lineCap='round';c.lineJoin='round';
  if(k==='rond'){const r=(38+4*pu)*s;c.strokeStyle='rgba(0,0,0,.45)';c.lineWidth=12*s;c.beginPath();c.arc(x,y,r,0,7);c.stroke();
    c.strokeStyle='#facc15';c.lineWidth=7*s;c.beginPath();c.arc(x,y,r,0,7);c.stroke()}
  else{const d=(14+6*pu)*s,L=78*s,ex=x+d*0.7,ey=y+d*0.7,sx=ex+L*0.7,sy=ey+L*0.7,hx=22*s;
    const trace=(col,w)=>{c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(sx,sy);c.lineTo(ex,ey);c.moveTo(ex,ey);c.lineTo(ex+hx,ey);c.moveTo(ex,ey);c.lineTo(ex,ey+hx);c.stroke()};
    trace('rgba(0,0,0,.5)',16*s);trace('#facc15',9*s)}
  c.restore()}

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
  if(!P.scenes.length&&enregistrer){alert('Ajoute au moins un écran.');return}
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
let GI=0,CHG=-1;
const capsI=()=>P.scenes.map((s,i)=>s.type==='texte'?-1:i).filter(i=>i>=0);
function ouvrirGrand(i){const C=capsI(),r=C.indexOf(i);if(r<0)return;GI=i;const s=P.scenes[i];
  $('gNum').textContent='Étape '+(r+1)+' sur '+C.length;$('gPrec').disabled=r===0;$('gSuiv').disabled=r===C.length-1;
  const im=imgDe(s.img);$('gImg').src=im?im.src:'';$('gTitre').value=s.titre||'';$('gTexte').value=s.texte||'';
  $('grand').classList.add('on');document.body.style.overflow='hidden';$('gImgBox').scrollTop=0;
  $('gImg').onload=placerPt;placerPt()}
const gMode=()=>(document.querySelector('[name=gmode]:checked')||{}).value||'lire';
function placerPt(){const s=P.scenes[GI],im=$('gImg'),pt=$('gPt'),mk=$('gMk');if(!s||!im.naturalWidth)return;
  pt.style.left=(im.offsetLeft+(s.fx==null?0.5:s.fx)*im.offsetWidth)+'px';pt.style.top=(im.offsetTop+(s.fy==null?0:s.fy)*im.offsetHeight)+'px';
  pt.style.display=gMode()==='zone'?'block':'none';
  mk.className=s.mk&&s.mk.k?'mk-'+s.mk.k:'';if(s.mk){mk.style.left=(im.offsetLeft+s.mk.x*im.offsetWidth)+'px';mk.style.top=(im.offsetTop+s.mk.y*im.offsetHeight)+'px'}
  $('gSansMk').hidden=!(s.mk&&s.mk.k)}
function fermerGrand(){$('grand').classList.remove('on');document.body.style.overflow='';document.querySelector('[name=gmode][value=lire]').checked=true;$('gImgBox').classList.remove('zone');rendreEcrans()}

/* ---------- recadrage ---------- */
const RC={i:-1,src:null,im:null,r:null,k:1,drag:null};
function ouvrirRecad(i){const sc=P.scenes[i];if(!sc||!sc.img)return;RC.i=i;RC.src=sc.img;$('recad').classList.add('on');chargerRecad()}
function chargerRecad(){const im=new Image();im.onload=()=>{RC.im=im;const cv=$('rCv'),bx=cv.parentElement.getBoundingClientRect();
    const k=Math.min((bx.width-24)/im.naturalWidth,(bx.height-24)/im.naturalHeight,1);RC.k=k;
    cv.width=Math.round(im.naturalWidth*k);cv.height=Math.round(im.naturalHeight*k);
    RC.r={x:0,y:0,w:im.naturalWidth,h:im.naturalHeight};$('rOrig').hidden=!P.scenes[RC.i].orig||RC.src===P.scenes[RC.i].orig;dessinerRecad()};
  im.src=URL.createObjectURL(RC.src)}
function dessinerRecad(){const cv=$('rCv'),c=cv.getContext('2d'),k=RC.k,r=RC.r;c.clearRect(0,0,cv.width,cv.height);
  c.drawImage(RC.im,0,0,cv.width,cv.height);c.fillStyle='rgba(0,0,0,.6)';
  const x=r.x*k,y=r.y*k,w=r.w*k,h=r.h*k;c.fillRect(0,0,cv.width,y);c.fillRect(0,y+h,cv.width,cv.height-y-h);c.fillRect(0,y,x,h);c.fillRect(x+w,y,cv.width-x-w,h);
  c.strokeStyle='#facc15';c.lineWidth=3;c.strokeRect(x+1.5,y+1.5,w-3,h-3);
  c.strokeStyle='rgba(250,204,21,.5)';c.lineWidth=1;c.beginPath();for(let t=1;t<3;t++){c.moveTo(x+w*t/3,y);c.lineTo(x+w*t/3,y+h);c.moveTo(x,y+h*t/3);c.lineTo(x+w,y+h*t/3)}c.stroke();
  c.fillStyle='#facc15';[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].forEach(([a,b])=>{c.fillRect(a-9,b-9,18,18)})}
function rPt(e){const cv=$('rCv'),b=cv.getBoundingClientRect();return{x:(e.clientX-b.left)*cv.width/b.width/RC.k,y:(e.clientY-b.top)*cv.height/b.height/RC.k}}
function rDown(e){if(!RC.im)return;e.preventDefault();$('rCv').setPointerCapture(e.pointerId);const p=rPt(e),r=RC.r,tol=26/RC.k;
  const coins={nw:[r.x,r.y],ne:[r.x+r.w,r.y],sw:[r.x,r.y+r.h],se:[r.x+r.w,r.y+r.h]};
  for(const n in coins)if(Math.abs(p.x-coins[n][0])<tol&&Math.abs(p.y-coins[n][1])<tol){RC.drag={m:n,r0:{...r},p0:p};return}
  if(p.x>r.x&&p.x<r.x+r.w&&p.y>r.y&&p.y<r.y+r.h){RC.drag={m:'move',r0:{...r},p0:p};return}
  RC.drag={m:'new',p0:p}}
function rMove(e){const d=RC.drag;if(!d)return;const p=rPt(e),W=RC.im.naturalWidth,H=RC.im.naturalHeight,cl=(v,a,b)=>Math.max(a,Math.min(b,v)),mn=40/RC.k;
  p.x=cl(p.x,0,W);p.y=cl(p.y,0,H);let r={...(d.r0||RC.r)};
  if(d.m==='move'){r.x=cl(d.r0.x+p.x-d.p0.x,0,W-r.w);r.y=cl(d.r0.y+p.y-d.p0.y,0,H-r.h)}
  else if(d.m==='new'){r={x:Math.min(p.x,d.p0.x),y:Math.min(p.y,d.p0.y),w:Math.abs(p.x-d.p0.x),h:Math.abs(p.y-d.p0.y)};if(r.w<mn||r.h<mn)return}
  else{let x1=r.x,y1=r.y,x2=r.x+r.w,y2=r.y+r.h;if(d.m[1]==='w')x1=Math.min(p.x,x2-mn);else x2=Math.max(p.x,x1+mn);if(d.m[0]==='n')y1=Math.min(p.y,y2-mn);else y2=Math.max(p.y,y1+mn);r={x:x1,y:y1,w:x2-x1,h:y2-y1}}
  RC.r=r;dessinerRecad()}
function rUp(){RC.drag=null}
function validerRecad(){const sc=P.scenes[RC.i],r=RC.r,im=RC.im;if(!sc||!im)return;
  const plein=r.x<1&&r.y<1&&r.w>im.naturalWidth-2&&r.h>im.naturalHeight-2;
  const fin=b=>{if(!sc.orig)sc.orig=sc.img;sc.img=b;if(b===sc.orig)sc.orig=null;sc.fx=0.5;sc.fy=0;sc.mk=null;sauver();$('recad').classList.remove('on');
    if($('grand').classList.contains('on')&&GI===RC.i)ouvrirGrand(RC.i);else rendreEcrans()};
  if(plein){if(RC.src!==sc.img)fin(RC.src);else $('recad').classList.remove('on');return}
  const c=document.createElement('canvas');c.width=Math.round(r.w);c.height=Math.round(r.h);c.getContext('2d').drawImage(im,r.x,r.y,r.w,r.h,0,0,c.width,c.height);
  c.toBlob(b=>{if(b)fin(b)},'image/jpeg',0.92)}

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
  let n=0;const N=P.scenes.filter(x=>x.type!=='texte').length;
  $('ecrans').innerHTML=P.scenes.map((s,i)=>{const it=pl.items[i+1],tx=s.type==='texte';if(!tx)n++;
    const nom=tx?(s.style==='secu'?'⚠️ Écran Sécurité':'📝 Écran de texte'):'Étape '+n+' sur '+N;
    return '<div class="ecr" data-i="'+i+'"><canvas width="270" height="480" data-cv="'+i+'" '+(tx?'':'aria-label="Aperçu, touche pour ouvrir en grand" role="button"')+'></canvas><div>'+
    '<div class="t"><span>'+nom+'</span><span class="dur">'+(s.duree?'⏱ ':'')+it.d.toFixed(1).replace('.',',')+' s</span></div>'+
    (tx?'<label>Petit titre au-dessus</label><input type="text" data-f="rub" value="'+esc(s.rub)+'" placeholder="'+(s.style==='secu'?'Sécurité':'Ex. C’est quoi ?')+'">'+
        '<label>Titre</label><input type="text" data-f="titre" value="'+esc(s.titre)+'" placeholder="'+(s.style==='secu'?'Ex. Jamais d’aide pour finir':'Ex. Le 10 RM')+'">'+
        '<label>Texte (une idée par ligne ; - en début de ligne = puce ; -> = flèche)</label><textarea data-f="texte" placeholder="Ex. La charge la plus lourde que tu soulèves **10 fois**, proprement.">'+esc(s.texte)+'</textarea>'
      :'<label>Titre de l’étape</label><input type="text" data-f="titre" value="'+esc(s.titre)+'" placeholder="Ex. Ouvre la séance 2">'+
        '<label>Explication (1 ou 2 phrases ; -> = flèche)</label><textarea data-f="texte" placeholder="Ex. Fais **10 répétitions** propres, pas une de plus.">'+esc(s.texte)+'</textarea>'+
        '<label>Zoom sur la capture</label><input type="range" min="0" max="100" step="5" data-f="zoom" value="'+(s.zoom==null?50:s.zoom)+'">'+
        (s.mk&&s.mk.k?'<p class="dur">'+(s.mk.k==='rond'?'⭕ Rond':'➜ Flèche')+' placé sur la capture</p>':''))+
    '<div class="mini"><button data-a="haut" '+(i?'':'disabled')+' aria-label="Monter">▲</button><button data-a="bas" '+(i<P.scenes.length-1?'':'disabled')+' aria-label="Descendre">▼</button>'+
    (tx?'':'<button data-a="grand">🔍 En grand</button><button data-a="chg">🖼 Changer</button><button data-a="rec">✂️ Recadrer</button>')+
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
    for(const f of fs){const b=await reduire(f);if(b)P.scenes.push({type:'ecran',img:b,titre:'',texte:'',zoom:50,fx:0.5,fy:0,duree:null,mk:null})}sauver();rendreEcrans()};
  const E=$('ecrans');
  E.addEventListener('input',e=>{const el=e.target,box=el.closest('.ecr');if(!box||!el.dataset.f)return;const s=P.scenes[+box.dataset.i];
    s[el.dataset.f]=el.dataset.f==='zoom'?+el.value:el.value;sauver();majTotal();dessinerMinis()});
  E.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;const i=+b.closest('.ecr').dataset.i,S=P.scenes,a=b.dataset.a,pl=plan();
    if(a==='haut'&&i>0)[S[i-1],S[i]]=[S[i],S[i-1]];
    else if(a==='bas'&&i<S.length-1)[S[i+1],S[i]]=[S[i],S[i+1]];
    else if(a==='plus'||a==='moins')S[i].duree=Math.max(3,Math.min(20,Math.round((S[i].duree||pl.items[i+1].d)+(a==='plus'?1:-1))));
    else if(a==='auto')S[i].duree=null;
    else if(a==='grand')return ouvrirGrand(i);
    else if(a==='chg'){CHG=i;return $('chgFi').click()}
    else if(a==='rec')return ouvrirRecad(i);
    else if(a==='suppr'){if(!confirm('Retirer cet écran ?'))return;S.splice(i,1)}
    sauver();rendreEcrans()});
  /* toucher l'aperçu = ouvrir la capture en grand */
  E.addEventListener('click',e=>{const cv=e.target.closest('canvas[data-cv]');if(cv&&P.scenes[+cv.dataset.cv].type!=='texte')ouvrirGrand(+cv.dataset.cv)});
  $('ajTexte').onclick=()=>{P.scenes.push({type:'texte',style:'expl',rub:'C’est quoi ?',titre:'',texte:'',duree:null});sauver();rendreEcrans();$('ecrans').lastElementChild.scrollIntoView({block:'center'})};
  $('ajSecu').onclick=()=>{P.scenes.push({type:'texte',style:'secu',rub:'Sécurité',titre:'',texte:'',duree:null});sauver();rendreEcrans();$('ecrans').lastElementChild.scrollIntoView({block:'center'})};
  $('gFerm').onclick=fermerGrand;$('gPrec').onclick=()=>{const C=capsI();ouvrirGrand(C[C.indexOf(GI)-1])};$('gSuiv').onclick=()=>{const C=capsI();ouvrirGrand(C[C.indexOf(GI)+1])};
  document.querySelectorAll('[name=gmode]').forEach(r=>r.onchange=()=>{$('gImgBox').classList.toggle('zone',r.value!=='lire'&&r.checked);placerPt()});
  $('gRec').onclick=()=>ouvrirRecad(GI);
  $('rAnn').onclick=()=>$('recad').classList.remove('on');$('rOk').onclick=validerRecad;
  $('rTout').onclick=()=>{RC.r={x:0,y:0,w:RC.im.naturalWidth,h:RC.im.naturalHeight};dessinerRecad()};
  $('rOrig').onclick=()=>{const sc=P.scenes[RC.i];if(!sc.orig)return;RC.src=sc.orig;chargerRecad()};
  const rcv=$('rCv');rcv.addEventListener('pointerdown',rDown);rcv.addEventListener('pointermove',rMove);rcv.addEventListener('pointerup',rUp);rcv.addEventListener('pointercancel',rUp);
  $('gChg').onclick=()=>{CHG=GI;$('chgFi').click()};
  $('chgFi').onchange=async e=>{const f=e.target.files[0];e.target.value='';const sc=P.scenes[CHG];if(!f||!sc)return;const b=await reduire(f);if(!b)return;
    sc.img=b;sc.orig=null;sc.fx=0.5;sc.fy=0;sc.mk=null;sauver();
    if($('grand').classList.contains('on')&&GI===CHG)ouvrirGrand(CHG);else rendreEcrans()};
  $('gSansMk').onclick=()=>{P.scenes[GI].mk=null;sauver();placerPt()};
  $('gTitre').oninput=e=>{P.scenes[GI].titre=e.target.value;sauver()};
  $('gTexte').oninput=e=>{P.scenes[GI].texte=e.target.value;sauver()};
  $('gImg').addEventListener('click',e=>{const m=gMode();if(m==='lire')return;const r=e.target.getBoundingClientRect(),s=P.scenes[GI];
    const x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));
    if(m==='zone'){s.fx=x;s.fy=y}else{s.mk={k:m,x,y};if(s.fy==null||Math.abs(y-s.fy)>0.3){s.fx=x;s.fy=y}}sauver();placerPt()});
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
window.MONTEUR={plan,dessiner,get P(){return P}};
})();

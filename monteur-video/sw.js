/* Monteur vidéo — hors ligne (modèle du portail mon-eps). */
const CACHE='monteur-video-v1.0';
const MES_CACHES=/^(?:monteur\-video\-v)\d+(?:\.\d+)?$/;
const SHELL=['./','index.html','app.js','eps-maj.js','manifest.webmanifest','icon-32.png','icon-180.png','icon-192.png','icon-512.png',
 '../polices/archivo.woff2','../polices/atkinson-400.woff2','../polices/atkinson-700.woff2'];
const ICONES=['musculation-eleves','cycle-musculation','musculation-prof','demi-fond-eleves','cycle-demi-fond','demi-fond-prof','carnet-step-','cycle-step','carnet-step-prof',
 'cross-training-eleves','cycle-cross-training','cross-training-prof','gym-eleves','cycle-gym','gym-prof','tennis-de-table-eleves','cycle-tennis-de-table','tennis-de-table-prof',
 'badminton-eleves','cycle-badminton','badminton-prof','volley-eleves','cycle-volley','cycle-danse','mon-eps'].map(n=>'../icons/'+n+'.png');
self.addEventListener('install',e=>{e.waitUntil((async()=>{const c=await caches.open(CACHE);
  await Promise.all(SHELL.concat(ICONES).map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})));self.skipWaiting()})())});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(MES_CACHES.test(k)&&k!==CACHE)await caches.delete(k);await self.clients.claim()})())});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==location.origin)return;
  if(r.mode==='navigate'){e.respondWith((async()=>{const c=await caches.open(CACHE);
    try{const net=await Promise.race([fetch(r),new Promise((_,no)=>setTimeout(no,3000))]);if(net&&net.ok){c.put('index.html',net.clone());return net}throw 0}
    catch(x){return (await c.match('index.html'))||(await c.match('./'))||fetch(r)}})());return}
  e.respondWith((async()=>{const c=await caches.open(CACHE);const hit=await c.match(r,{ignoreSearch:true});
    const net=fetch(r).then(res=>{if(res&&res.ok)c.put(r,res.clone());return res}).catch(()=>null);
    if(hit){e.waitUntil(net);return hit}return (await net)||Response.error()})())});

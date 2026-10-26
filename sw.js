/* Hors ligne : l'appli est gardée sur l'appareil à la première ouverture avec internet,
   puis s'ouvre sans connexion. La page est rechargée depuis GitHub dès que le réseau répond (3 s max) ;
   les autres fichiers sont servis depuis l'appareil et mis à jour en arrière-plan. */
const CACHE='mon-eps-v12';
// Toutes les applis partagent le même stockage (même adresse github.io) : on n'efface QUE les anciennes versions de CETTE appli.
const MES_CACHES=/^(?:mon\-eps\-v)\d+$/;

const SHELL=['./','index.html','polices/archivo.woff2','polices/atkinson-400.woff2','polices/atkinson-700.woff2','manifest.webmanifest','icon-32.png','icon-180.png','icon-192.png','icon-512.png'];
const FILES=[];
const CDN=/(^|\.)(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|cdn\.tailwindcss\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/;
self.addEventListener('install',e=>{e.waitUntil((async()=>{const c=await caches.open(CACHE);
  await Promise.all(SHELL.concat(FILES).map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})));self.skipWaiting()})())});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(MES_CACHES.test(k)&&k!==CACHE)await caches.delete(k);await self.clients.claim()})())});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(r.mode==='navigate'&&u.origin===location.origin){e.respondWith((async()=>{const c=await caches.open(CACHE);
    try{const net=await Promise.race([fetch(r),new Promise((_,no)=>setTimeout(no,3000))]);if(net&&net.ok){c.put('index.html',net.clone());return net}throw 0}
    catch(x){return (await c.match('index.html'))||(await c.match('./'))||fetch(r)}})());return}
  if(u.origin===location.origin||CDN.test(u.hostname)){e.respondWith((async()=>{const c=await caches.open(CACHE);
    const hit=await c.match(r,{ignoreSearch:u.origin===location.origin});
    const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque'))c.put(r,res.clone());return res}).catch(()=>null);
    if(hit){e.waitUntil(net);return hit}
    return (await net)||Response.error()})())}
});

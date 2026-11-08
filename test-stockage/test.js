/* =====================================================================
   test.js — page de test jetable : deux applis du même site (Test A et
   Test B), installées ou non sur l'écran d'accueil, voient-elles les mêmes
   données ? On écrit et on lit la même clé dans les deux stockages que
   les applis EPS utilisent : stockage simple (localStorage) et base de
   données (IndexedDB). À supprimer après le test.
   ===================================================================== */
'use strict';
(function(){
  var NOM=document.documentElement.getAttribute('data-test');            // « A » ou « B »
  var CLE='eps-test-partage';
  var $=function(id){return document.getElementById(id)};
  var mode=(navigator.standalone||matchMedia('(display-mode: standalone)').matches)?'icône de l’écran d’accueil':'navigateur (Safari)';
  function heure(){var d=new Date();return d.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})+' à '+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
  function base(){return new Promise(function(ok,ko){
    if(!window.indexedDB)return ko(new Error('pas de base de données'));
    var q=indexedDB.open(CLE,1);q.onupgradeneeded=function(){q.result.createObjectStore('v')};
    q.onsuccess=function(){ok(q.result)};q.onerror=function(){ko(q.error)}})}
  function lireBase(){return base().then(function(db){return new Promise(function(ok){
    var t=db.transaction('v','readonly').objectStore('v').get('x');t.onsuccess=function(){ok(t.result||null)};t.onerror=function(){ok(null)}})}).catch(function(e){return '(erreur : '+e.message+')'})}
  function ecrireBase(v){return base().then(function(db){return new Promise(function(ok){
    var t=db.transaction('v','readwrite');t.objectStore('v').put(v,'x');t.oncomplete=ok;t.onerror=ok})}).catch(function(){})}
  function afficher(){
    var simple=null;try{simple=localStorage.getItem(CLE)}catch(e){simple='(erreur)'}
    $('mode').textContent=mode;
    $('simple').textContent=simple||'rien';
    lireBase().then(function(v){$('bdd').textContent=v||'rien'});
    if(navigator.storage&&navigator.storage.persisted)navigator.storage.persisted().then(function(p){$('prot').textContent=p?'oui':'non'});
    else $('prot').textContent='non disponible';
  }
  $('ecrire').onclick=function(){
    var v='écrit par '+NOM+' ('+mode+') le '+heure();
    try{localStorage.setItem(CLE,v)}catch(e){}
    ecrireBase(v).then(afficher);
  };
  $('relire').onclick=afficher;
  $('proteger').onclick=function(){
    if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().then(function(p){$('prot').textContent=p?'oui':'non (refusé)'});
  };
  document.addEventListener('visibilitychange',function(){if(!document.hidden)afficher()});
  afficher();
})();

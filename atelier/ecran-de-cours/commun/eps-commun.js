/* =====================================================================
   eps-commun.js — comportements communs des outils de cycle EPS
   Même fichier dans chaque dépôt (copie identique, pour le hors ligne).
   - Regroupe le titre de l'appli et ses boutons sur une seule ligne.
   - Ajoute le bouton « Mode gymnase » s'il n'existe pas déjà.
   - Mode gymnase actif par défaut quand l'appli est ouverte depuis
     l'écran d'accueil de l'iPad (tant qu'on ne l'a pas désactivé).
   ===================================================================== */
(function(){
  'use strict';
  var CLE = 'eps-gym:' + location.pathname.replace(/index(-old)?\.html$/, '');

  function installee(){
    try{ return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches; }
    catch(e){ return false; }
  }
  function lire(){
    try{ var v = localStorage.getItem(CLE); if(v === '1') return true; if(v === '0') return false; }catch(e){}
    return installee();
  }
  function ecrire(v){ try{ localStorage.setItem(CLE, v ? '1' : '0'); }catch(e){} }

  function peindre(on){
    document.body.classList.toggle('gym', on);
    var b = document.getElementById('gymbtn');
    if(b){
      b.textContent = on ? 'Quitter le mode gymnase' : 'Mode gymnase';
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  function demarrer(){
    var header = document.querySelector('header');
    var h1 = header && header.querySelector('h1');
    if(!header || !h1) return;

    // L'appli a déjà son propre mode gymnase (tennis de table) : on ne double pas.
    if(document.getElementById('gymbtn')) return;

    // Titre + bouton sur une ligne.
    var ligne = h1.parentElement !== header ? h1.parentElement : null;
    if(ligne){ ligne.classList.add('epstop'); }
    else{
      ligne = document.createElement('div');
      ligne.className = 'epstop';
      h1.parentNode.insertBefore(ligne, h1);
      ligne.appendChild(h1);
    }
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'gymbtn'; b.className = 'tb mini noprint';
    b.addEventListener('click', function(){
      var on = !document.body.classList.contains('gym');
      ecrire(on); peindre(on);
    });
    ligne.appendChild(b);
    peindre(lire());
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();

/* Écran de cours — demi-fond : ce qui est propre à l'activité.
   Source : mon-eps/atelier/ecran-de-cours/apps/. Le moteur commun est ecran.js. */
const APP={
  old:'cycle-demi-fond-old.html',
  cle:'dq',
  niv:{s:{label:'Seconde',court:'2de',long:'SECONDE',L:SESSIONS},t:{label:'Terminale',court:'Tle',long:'TERMINALE',L:T_SESSIONS}},
  defaut:'s',
  lienOld:(c,id)=>APP.old+'#'+c+'-'+id,
  lireCur:()=>lire('df2-cur2',{})||{},
  marquerJour(c,id){const cur=Object.assign({s:'',t:''},lire('df2-cur2',{}));cur[c]=id;ecrire('df2-cur2',cur);Object.assign(CUR,cur)},
  outils:[{"titre": "Pendant le cours", "items": [["calc", "Ma calculette", "une VMA → toutes les cibles"], ["tables", "Tableaux d’allures", "VMA 8 à 20 · à imprimer"], ["warm", "Échauffement autonome", "fiche · 4 niveaux · grille"], ["piste", "Piste et plots", "1 plot = 1 km/h · départs"]]}, {"titre": "Adapter", "items": [["bank", "Banque de situations", "16 situations · N1–N4"], ["diff", "Travail par niveaux", "groupes G1–G4 · inaptes"], ["roles", "Coach, chrono, juge", "AFL3 · fiche élève"], ["coach", "Repères d’entraîneur", "intensités · récup · sécurité"]]}, {"titre": "Évaluer", "items": [["evalf", "Évaluation", "barème · calcul de la note"], ["check", "Lien avec l’éval", "référentiel Pompidou"]]}],
  urlOutil:id=>APP.old+'#'+J.c+'-'+id,
  racc:[[/^warm$/,'warm','Échauffement autonome'],[/outil « évaluation »|barème|course [123]\b|épreuve blanche/i,'evalf','Barème et note'],[/tableau d’allures|tableaux d’allures/i,'tables','Tableaux d’allures'],[/vma|plot cible|au plot|allure/i,'calc','Calculette VMA']],
  etapesEchauff(s,b){
    const brut=String(s.warm||'').replace(/<a [^>]*>.*?<\/a>/g,'').replace(/<[^>]+>/g,'').trim();
    if(typeof DF_GAMMES==='undefined')return `<div style="margin-top:14px">${orgHTML(brut)}</div>`;
    const e=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    const liste=L=>L.filter(x=>!/^sg/.test(x[0])).map(x=>e(x[1])).join(' · ');
    const carte=(f,t,l)=>`<figure style="margin:0;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:8px"><img src="img/echauffement/${f}" alt="" loading="lazy" style="width:100%;height:120px;object-fit:contain"><figcaption style="font-size:14px;line-height:1.35"><b>${e(t)}</b>${l.map(x=>`<br>${e(x)}`).join('')}</figcaption></figure>`;
    const grille=h=>`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin:8px 0 14px">${h}</div>`;
    const P=(n,t,d,c)=>`<h4 style="margin:16px 0 4px">${n} · ${e(t)} <span style="font-weight:400;color:#5b6470">${e(d)}</span></h4>${c}`;
    return `<div style="margin-top:14px">${orgHTML(brut)}</div>
     ${P(1,'Cardio','5 min','<p>'+liste(DF_WARM[0])+'. On passe à la suite quand les 3 signes sont là : j’ai chaud et je transpire ; je respire vite mais je parle encore ; pouls 150-160.</p>')}
     ${P(2,'Articulaire','2 min, de bas en haut','<p>'+liste(DF_WARM[1])+'</p>')}
     ${P(3,'Étirements actifs-dynamiques','3 min, chaque côté','<p style="color:#5b6470">① j’allonge et je contracte sans bouger 4 s · ② je freine en contractant 4 s · je relâche · ③ 8 s de mouvement.</p>'+grille(DF_ETIR.map(x=>carte(x[2],x[1],['① '+x[3],'② '+x[4],'③ '+x[5]])).join('')))}
     ${P(4,'Renforcement','2 min, 3 au choix','<p>'+liste(DF_WARM[3])+'</p>')}
     ${P(5,'Gammes','3 min, 4 au choix · 20 à 30 m, retour en trottinant',grille(DF_GAMMES.map(x=>carte(x[2],x[1],[x[3],'✓ '+x[4]])).join('')))}
     ${P('Fin','Obligatoire','','<p>'+liste(DF_WARM[5])+'</p>')}`;
  },
  schemaDe:e=>{if(!e||!e.sch||!SCH[e.sch])return '';const sp=SCH[e.sch];return `<div class="schema">${piste(sp)}</div><div class="legende-o">${LEGEND}</div>${sp.cap?`<p class="cap">${sp.cap}</p>`:''}`}
};

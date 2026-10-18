/* Écran de cours — volley-ball : ce qui est propre à l'activité.
   Source : mon-eps/atelier/ecran-de-cours/apps/. Le moteur commun est ecran.js. */
function courtT(sp){
  let svg=court(sp);
  const W=(14+2*MX)*S,H=(7+2*MY)*S;
  // le sol du gymnase et les lignes des autres sports, très pâles
  const gym=`<rect class="c-gym" x="0" y="0" width="${W}" height="${H}"/><rect class="c-gymline" x="${X(-0.9)}" y="${Y(-0.5)}" width="${15.8*S}" height="${8*S}"/><circle class="c-gymline" cx="${X(7)}" cy="${Y(3.5)}" r="${1.8*S}"/><path class="c-gymline" d="M${X(-0.9)},${Y(0.3)} A${3.4*S},${3.4*S} 0 0 1 ${X(-0.9)},${Y(6.7)}"/><path class="c-gymline" d="M${X(14.9)},${Y(0.3)} A${3.4*S},${3.4*S} 0 0 0 ${X(14.9)},${Y(6.7)}"/>`;
  svg=svg.replace('</defs>','</defs>'+gym);
  // l'ordre des trajets du ballon, numéroté
  const bl=sp.balls||[];
  if(sp.ordre!==false&&bl.length>=2&&bl.length<=4){
    const n=bl.map((r,k)=>{const a=[X(r[0][0]),Y(r[0][1])],b=[X(r[1][0]),Y(r[1][1])],p=arrowPath(r[0],r[1],r[2]===undefined?0.6:r[2]),c=p.from;
      const mx=(a[0]+2*c[0]+b[0])/4,my=(a[1]+2*c[1]+b[1])/4;return `<g class="c-ordre"><circle cx="${mx}" cy="${my}" r="12"/><text x="${mx}" y="${my}">${k+1}</text></g>`}).join('');
    svg=svg.replace('</svg>',n+'</svg>');
  }
  return svg;
}
function legende(sp){
  const t=new Set((sp.players||[]).map(p=>p.team||'a')),out=[];
  if(t.has('a'))out.push('<span><i class="rond" style="background:#2F6FB0"></i>équipe qui travaille</span>');
  if(t.has('b'))out.push('<span><i class="rond" style="background:#C2410C"></i>serveur, lanceur, adversaire</span>');
  if(t.has('n'))out.push('<span><i class="rond" style="background:#5A6475"></i>observateur, arbitre</span>');
  if((sp.balls||[]).length)out.push('<span><i class="pt"></i>ballon</span>');
  if((sp.runs||[]).length)out.push('<span><i class="tr"></i>déplacement</span>');
  if(sp.ordre!==false&&(sp.balls||[]).length>=2&&(sp.balls||[]).length<=4)out.push('<span><i class="num">1</i>ordre des actions</span>');
  return out.length?`<div class="legende">${out.join('')}</div>`:'';
}
const ROUTINE=(WARMUPS[0]&&WARMUPS[0].deroul)||[];
const EQUIPE=[['3','Général'],['2','Spécifique, avec ballon'],['2','Cheville, épaule et gainage'],['5','Travail ciblé sur l’axe choisi']];
function etapesVolley(s,b){
  const brut=String(s.warm||'').replace(/<a [^>]*>.*?<\/a>/g,'').trim();
  const lien=(String(s.warm||'').match(/<a [^>]*data-go="(\w+)"[^>]*>(.*?)<\/a>/)||[]);
  const fiche=lien[1]?`<p class="texte" style="margin-top:12px"><a href="cycle-volley-old.html" data-ov="${lien[1]}">${lien[2]}</a></p>`:'';
  let etapes=[],note='';
  if(/présente la fiche/.test(brut)){
    etapes=[['2','Présenter la fiche à la classe']].concat(EQUIPE);
    const m=brut.match(/spécifique 2 \(([^)]+)\)/);if(m)etapes[2]=['2','Spécifique : '+m[1]];
    note=brut.replace(/^.*?travail ciblé 5\.?\s*/,'');
  } else if(/^Échauffement d’équipe/.test(brut)){
    etapes=EQUIPE.slice();note=brut.replace(/^Échauffement d’équipe[^.;]*[.;]\s*/,'');
  } else if(/^Routine type/.test(brut)){
    etapes=ROUTINE.map(x=>{const m=x.match(/^(\d+)\s*min\s*:\s*(.*)$/);const t=m?m[2].split('. ')[0].replace(/\.$/,''):x;return [m?m[1]:'',t.charAt(0).toUpperCase()+t.slice(1)]});
    const suite=brut.replace(/^Routine type,?\s*(puis\s*)?/,'').replace(/\.$/,'');if(suite)etapes.push(['',suite.charAt(0).toUpperCase()+suite.slice(1)]);
  } else {
    etapes=brut.replace(/\.$/,'').split(/,\s*puis\s*/).map(x=>['',x.charAt(0).toUpperCase()+x.slice(1)]);
  }
  const ol=`<ol class="etapes">${etapes.map(x=>`<li><b class="${x[0]?'':'vide'}">${x[0]?x[0]+'′':'·'}</b><span>${esc(x[1])}</span></li>`).join('')}</ol>`;
  return ol+(note?`<div class="aujourdhui"><b>Aujourd’hui :</b> ${esc(note)}</div>`:'')+fiche;
}
const APP={
  old:'cycle-volley-old.html',
  cle:'vt',
  niv:{p:{label:'Première',court:'1re',long:'PREMIÈRE',L:P_SESSIONS},t:{label:'Terminale',court:'Tle',long:'TERMINALE',L:SESSIONS}},
  defaut:'t',
  lienOld:(c,id)=>APP.old+'#'+c+'-'+id,
  lireCur:()=>Object.assign({t:'s4',p:''},lire('volley-cur',{})),
  marquerJour(c,id){const cur=Object.assign({t:'s4',p:''},lire('volley-cur',{}));cur[c]=id;ecrire('volley-cur',cur);Object.assign(CUR,cur);
    const L=lire('volley-tournois',{})||{};L.prefs={id:'prefs',kind:'prefs',cur:Object.assign({},cur),updated:Date.now()};ecrire('volley-tournois',L)},
  outils:[{"titre": "Pendant le cours", "items": [["rot", "Tournoi", "générateur · équipes et terrains"], ["classe", "Ma classe", "élèves · équipes · notes S9"], ["warm", "Échauffements", "11 situations avec ballon"], ["equipe", "Échauffement d’équipe", "S4–S7 · fiche à imprimer"]]}, {"titre": "Adapter", "items": [["bank", "Banque d’exercices", "34 exercices de rechange"], ["beg", "Débutants", "situations collège"], ["diff", "Travail par niveaux", "fiches N1–N4"], ["coach", "Repères d’entraîneur", "FFVB · FIVB"]]}, {"titre": "Évaluer", "items": [["obs", "Observation", "fiches joueur et équipe"], ["fev", "Fiche d’évaluation", "référentiel S9 · grille"], ["check", "Lien avec l’éval", "référentiel Pompidou"]]}],
  urlOutil:id=>APP.old+'#'+J.c+'-'+(id==='check'&&J.c==='p'?'checkp':id),
  racc:[[/^warm$/,'warm','Fiches d’échauffement'],[/tournoi|montante-descendante/i,'rot','Ouvrir le tournoi'],[/fiche d’évaluation|onglet fiche/i,'fev','Fiche d’évaluation'],[/match d’observation|observation/i,'obs','Observation']],
  schemaDe:e=>{if(!e||!e.sch||!SCH[e.sch])return '';const sp=SCH[e.sch];return `<div class="schema">${courtT(sp)}</div>${legende(sp)}${sp.cap?`<p class="cap">${esc(sp.cap)}</p>`:''}`},
  etapesEchauff:etapesVolley
};

/* =====================================================================
   eps-export.js — export PDF et Word (.docx) d'un cycle pédagogique, hors connexion.
   Chantier 14 (27/11/2026), d'abord pour le cycle musculation.
   - Le contenu vient de l'appli (adaptateur propre au cycle) sous forme d'un modèle de document :
       {titre, sousTitre, garde:[lignes], couleur:'#4D7C0F', pied:'…', fichier:'nom',
        sections:[{id, titre, sommaire:true|false, blocs:[…]}]}
     blocs : {t:'h', x}                 sous-titre
             {t:'p', x, label?}          paragraphe (label en gras devant)
             {t:'ul'|'ol', items:[…]}    liste à puces / numérotée
             {t:'table', entetes:[…], lignes:[[…]]}
             {t:'cadre', titre, lignes:[…]}   encadré (ex. texte prêt pour Pronote)
   - PDF : jsPDF (jspdf.umd.min.js, MIT, chargé à la demande, gardé hors ligne). Police Helvetica :
     accents français et typographie (’ « » œ …) en Windows-1252.
   - Word : fichier .docx écrit ici (XML Office Open + archive ZIP non compressée), sans bibliothèque.
   Textes sélectionnables et copiables dans les deux formats. Une page par séance, page de garde, sommaire.
   ===================================================================== */
(function(){
'use strict';
function telecharger(nom,blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=nom;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}
function chargerJsPDF(){if(window.jspdf)return Promise.resolve(window.jspdf);
  return new Promise((ok,ko)=>{const s=document.createElement('script');s.src='jspdf.umd.min.js';s.onload=()=>window.jspdf?ok(window.jspdf):ko(new Error('jsPDF absent'));s.onerror=()=>ko(new Error('Impossible de charger le module PDF (ouvrez l’outil une fois avec le Wi-Fi).'));document.head.appendChild(s)})}
const hex=c=>{c=String(c||'#333333').replace('#','');return [parseInt(c.slice(0,2),16),parseInt(c.slice(2,4),16),parseInt(c.slice(4,6),16)]};
/* typographie française : espace insécable avant ? ! : ; » et après « (jamais de « » » seul en début de ligne) */
const insec=t=>String(t==null?'':t).replace(/[ \t]+([?!:;»])/g,'\u00a0$1').replace(/«[ \t]+/g,'«\u00a0');
const dateFr=()=>new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});

/* ============================ PDF ============================ */
async function pdf(M){
  const {jsPDF}=await chargerJsPDF();
  const d=new jsPDF({unit:'mm',format:'a4',compress:true});
  /* Helvetica (Windows-1252) : les rares signes hors de ce jeu sont écrits en équivalents lisibles */
  const SF={'→':'->','←':'<-','−':'-','≥':'>=','≤':'<=','≈':'env.','≠':'!=','′':"'",'″':'"','✓':'v','•':'•'};
  const sf=t=>String(t).replace(/[^\u0000-\u00ff€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/g,c=>SF[c]!=null?SF[c]:'?');
  {const T=d.text.bind(d),W=d.getTextWidth.bind(d),S=d.splitTextToSize.bind(d);
   d.text=(t,...a)=>T(Array.isArray(t)?t.map(sf):sf(t),...a);d.getTextWidth=t=>W(sf(t));d.splitTextToSize=(t,...a)=>S(sf(t),...a)}
  d.setProperties({title:M.titre,subject:M.sousTitre||'',creator:'MON EPS',author:M.auteur||''});
  const W=210,H=297,G=20,D=20,HAUT=20,BAS=22,LARG=W-G-D,AC=hex(M.couleur),GRIS=[90,100,117],ENCRE=[23,32,51];
  let y=HAUT;const pagesSec={},liens=[];
  const police=(st,taille,coul)=>{d.setFont('helvetica',st||'normal');d.setFontSize(taille||10.5);d.setTextColor(...(coul||ENCRE))};
  const lh=t=>t*0.3528*1.38;   // interligne (mm) pour une taille en points
  const place=h=>{if(y+h>H-BAS){d.addPage();y=HAUT}};
  /* paragraphe riche : segments [{x, b}] (b = gras), retour à la ligne mot à mot */
  function riche(segs,taille,x0,larg,coul){
    taille=taille||10.5;x0=x0||G;larg=larg||LARG;const L=lh(taille);
    const mots=[];segs.forEach(s=>insec(s.x).split(/([ \t\n]+)/).forEach(m=>{if(m!=='')mots.push({m:m.replace(/\u00a0/g,' '),b:!!s.b})}));   /* insécable : collé pour la coupure, espace normale au tracé (largeur juste) */
    let ligne=[],w=0;const lignes=[];
    const larg_=o=>{police(o.b?'bold':'normal',taille);return d.getTextWidth(o.m)};
    mots.forEach(o=>{if(/^[ \t\n]+$/.test(o.m)){if(ligne.length){ligne.push({m:' ',b:o.b});w+=larg_({m:' ',b:o.b})}return}
      const lw=larg_(o);if(w+lw>larg&&ligne.length){while(ligne.length&&ligne[ligne.length-1].m===' ')ligne.pop();lignes.push(ligne);ligne=[];w=0}
      if(lw>larg){const p=d.splitTextToSize(o.m,larg);p.slice(0,-1).forEach(q=>lignes.push([{m:q,b:o.b}]));ligne=[{m:p[p.length-1],b:o.b}];w=larg_(ligne[0])}else{ligne.push(o);w+=lw}});
    if(ligne.length)lignes.push(ligne);
    lignes.forEach(l=>{place(L);let x=x0;l.forEach(o=>{police(o.b?'bold':'normal',taille,coul);d.text(o.m,x,y+L*0.75);x+=d.getTextWidth(o.m)});y+=L});
  }
  function titreSec(t,petit){place(16);police('bold',petit?14:18,AC);d.splitTextToSize(t,LARG).forEach(l=>{d.text(l,G,y+7);y+=8.6});d.setDrawColor(...AC);d.setLineWidth(.8);d.line(G,y+1,G+LARG,y+1);y+=6}
  function bloc(b){
    if(b.t==='h'){place(14);y+=3;police('bold',12.5,AC);d.splitTextToSize(b.x,LARG).forEach(l=>{place(6);d.text(l,G,y+4.6);y+=6});y+=1;return}
    if(b.t==='p'){riche((b.label?[{x:b.label+' ',b:true}]:[]).concat([{x:b.x}]),10.5);y+=2;return}
    if(b.t==='ul'||b.t==='ol'){b.items.forEach((it,i)=>{const pu=b.t==='ol'?(i+1)+'.':'•';place(lh(10.5));police('bold',10.5,b.t==='ol'?AC:ENCRE);d.text(pu,G+1,y+lh(10.5)*.75);
        riche(typeof it==='string'?[{x:it}]:it,10.5,G+7,LARG-7);y+=.8});y+=1.5;return}
    if(b.t==='table'){const n=b.entetes.length,cw=b.largeurs||b.entetes.map(()=>LARG/n);const pad=2,L=lh(10);
      const row=(cells,gras,fond)=>{police(gras?'bold':'normal',10);const sp=cells.map((c,i)=>d.splitTextToSize(insec(c),cw[i]-2*pad).map(q=>q.replace(/\u00a0/g,' ')));const h=Math.max(...sp.map(s=>s.length))*L+2*pad;
        place(h);if(fond){d.setFillColor(...fond);d.rect(G,y,LARG,h,'F')}d.setDrawColor(215,220,210);d.setLineWidth(.2);d.line(G,y+h,G+LARG,y+h);
        let x=G;sp.forEach((s,i)=>{police(gras?'bold':'normal',10,gras?AC:ENCRE);s.forEach((l,j)=>d.text(l,x+pad,y+pad+L*(j+.75)));x+=cw[i]});y+=h};
      row(b.entetes,true,[238,245,227]);b.lignes.forEach(r=>row(r,false));y+=4;return}
    if(b.t==='cadre'){const pad=4,L=lh(10.5);police('normal',10.5);const sp=[];b.lignes.forEach(l=>{d.splitTextToSize(insec(l),LARG-2*pad).forEach(q=>sp.push(q.replace(/\u00a0/g,' ')));sp.push('')});sp.pop();
      let i=0;const ht=sp.length*L+2*pad+7;place(ht<=H-BAS-HAUT?ht:L*3+12);let prem=true;   /* un encadré court n'est jamais coupé entre deux pages */
      while(i<sp.length){const dispo=Math.max(1,Math.floor((H-BAS-y-2*pad-(prem?7:0))/L));const part=sp.slice(i,i+dispo);const h=part.length*L+2*pad+(prem?7:0);
        d.setFillColor(248,250,245);d.setDrawColor(...AC);d.setLineWidth(.5);d.roundedRect(G,y,LARG,h,2,2,'FD');let yy=y+pad;
        if(prem){police('bold',10.5,AC);d.text(b.titre,G+pad,yy+4);yy+=7}
        police('normal',10.5);part.forEach(l=>{d.text(l,G+pad,yy+L*.75);yy+=L});y+=h+4;i+=part.length;prem=false;if(i<sp.length){d.addPage();y=HAUT}}
      return}
  }
  /* page de garde (M.pageGarde===false : simple bandeau de titre en haut de la 1re page) */
  if(M.pageGarde===false){d.setFillColor(...AC);d.rect(0,0,W,34,'F');police('bold',20,[255,255,255]);d.text(M.titre,G,17);police('normal',11.5,[255,255,255]);if(M.sousTitre)d.text(M.sousTitre,G,26);y=44;
    (M.garde||[]).forEach(l=>{riche([{x:l}],10.5,G,LARG,GRIS);y+=1})}
  else{d.setFillColor(...AC);d.rect(0,0,W,92,'F');
  police('bold',30,[255,255,255]);d.splitTextToSize(M.titre,W-40).forEach((l,i)=>d.text(l,G,52+i*12));
  police('normal',14,[255,255,255]);if(M.sousTitre)d.text(M.sousTitre,G,80);
  y=112;(M.garde||[]).forEach(l=>{riche([{x:l}],12,G,LARG,ENCRE);y+=2});
  police('normal',10,GRIS);d.text('Document exporté le '+dateFr()+' depuis MON EPS'+(M.version?' ('+M.version+')':'')+'.',G,H-30)}
  /* sommaire : réservé en page 2, rempli à la fin */
  const avecSommaire=M.sommaire!==false&&M.sections.filter(s=>s.sommaire!==false).length>=4;
  if(avecSommaire){d.addPage()}
  M.sections.forEach((s,i)=>{if(s.suite&&(i>0||M.pageGarde===false)){y+=i?5:0;place(95)}else{d.addPage();y=HAUT}pagesSec[s.id]=d.getNumberOfPages();titreSec(s.titre,s.suite);s.blocs.forEach(bloc)});
  if(avecSommaire){d.setPage(2);y=HAUT;titreSec('Sommaire');
    M.sections.filter(s=>s.sommaire!==false).forEach(s=>{police('normal',11.5);const p=String(pagesSec[s.id]);const t=d.splitTextToSize(s.titre,LARG-18)[0];
      d.text(t,G,y+5);d.text(p,G+LARG,y+5,{align:'right'});d.setDrawColor(200,205,200);d.setLineDashPattern([.5,1],0);d.line(G+d.getTextWidth(t)+2,y+5,G+LARG-d.getTextWidth(p)-2,y+5);d.setLineDashPattern([],0);
      d.link(G,y,LARG,7,{pageNumber:pagesSec[s.id]});y+=8})}
  /* pieds de page */
  const N=d.getNumberOfPages();for(let i=M.pageGarde===false?1:2;i<=N;i++){d.setPage(i);police('normal',8.5,GRIS);d.text(M.pied||M.titre,G,H-10);d.text(i+' / '+N,W-D,H-10,{align:'right'})}
  telecharger((M.fichier||'cycle')+'.pdf',d.output('blob'));
  return N;
}

/* ============================ DOCX ============================ */
const X=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const run=(t,o)=>{o=o||{};return `<w:r><w:rPr>${o.b?'<w:b/>':''}${o.coul?`<w:color w:val="${o.coul}"/>`:''}${o.sz?`<w:sz w:val="${o.sz}"/><w:szCs w:val="${o.sz}"/>`:''}</w:rPr><w:t xml:space="preserve">${X(insec(t))}</w:t></w:r>`};
const para=(contenu,o)=>{o=o||{};return `<w:p><w:pPr>${o.style?`<w:pStyle w:val="${o.style}"/>`:''}${o.saut?'<w:pageBreakBefore/>':''}${o.num?`<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${o.num}"/></w:numPr>`:''}${o.centre?'<w:jc w:val="center"/>':''}${o.esp!=null?`<w:spacing w:before="${o.esp}" w:after="${o.esp}"/>`:''}</w:pPr>${contenu}</w:p>`};
function docxXML(M){
  const ac=String(M.couleur||'#4D7C0F').replace('#','').toUpperCase();let numId=2,nums=[];   /* 1 = puces ; 2+ = une numérotation par liste (repart à 1) */
  let corps='';let bm=0;const signets={};
  if(M.pageGarde===false){corps+=para(run(M.titre,{b:true,sz:40,coul:ac}),{esp:0})+(M.sousTitre?para(run(M.sousTitre,{sz:24})):'');(M.garde||[]).forEach(l=>{corps+=para(run(l,{sz:20,coul:'5A6475'}))})}
  else{corps+=para(run(M.titre,{b:true,sz:56,coul:ac}),{style:'Title'})+(M.sousTitre?para(run(M.sousTitre,{sz:30}),{esp:120}):'');
  (M.garde||[]).forEach(l=>{corps+=para(run(l,{sz:24}))});
  corps+=para(run('Document exporté le '+dateFr()+' depuis MON EPS'+(M.version?' ('+M.version+')':'')+'.',{sz:18,coul:'5A6475'}),{esp:480})}
  const S=M.sections.filter(s=>s.sommaire!==false);
  M.sections.forEach((s,i)=>signets[s.id]='sec_'+(i+1));
  if(M.sommaire!==false&&S.length>=4){corps+=para(run('Sommaire'),{style:'Heading1',saut:true});
    S.forEach(s=>{corps+=`<w:p><w:pPr><w:spacing w:after="80"/></w:pPr><w:hyperlink w:anchor="${signets[s.id]}" w:history="1">${run(s.titre,{coul:ac,sz:24})}</w:hyperlink></w:p>`})}
  M.sections.forEach(s=>{const id=++bm;
    corps+=`<w:p><w:pPr><w:pStyle w:val="${s.suite?'Heading2':'Heading1'}"/>${s.suite?'<w:spacing w:before="360"/>':'<w:pageBreakBefore/>'}</w:pPr><w:bookmarkStart w:id="${id}" w:name="${signets[s.id]}"/>${run(s.titre)}<w:bookmarkEnd w:id="${id}"/></w:p>`;
    s.blocs.forEach(b=>{
      if(b.t==='h')corps+=para(run(b.x),{style:'Heading2'});
      else if(b.t==='p')corps+=para((b.label?run(b.label+' ',{b:true}):'')+run(b.x));
      else if(b.t==='ul'||b.t==='ol'){let n=1;if(b.t==='ol'){n=numId++;nums.push(n)}
        b.items.forEach(it=>{corps+=para(typeof it==='string'?run(it):it.map(g=>run(g.x,{b:g.b})).join(''),{style:'ListParagraph',num:n})})}
      else if(b.t==='table'){const n=b.entetes.length,tw=9638,cw=(b.largeurs?b.largeurs.map(x=>Math.round(x/170*tw)):b.entetes.map(()=>Math.floor(tw/n)));
        const cel=(t,j,ent)=>`<w:tc><w:tcPr><w:tcW w:w="${cw[j]}" w:type="dxa"/>${ent?'<w:shd w:val="clear" w:color="auto" w:fill="EEF5E3"/>':''}</w:tcPr>${para(run(t,{b:ent,coul:ent?ac:null}),{esp:40})}</w:tc>`;
        corps+=`<w:tbl><w:tblPr><w:tblW w:w="${tw}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="D7DCD2"/><w:bottom w:val="single" w:sz="4" w:color="D7DCD2"/><w:insideH w:val="single" w:sz="4" w:color="D7DCD2"/></w:tblBorders><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${cw.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>
          <w:tr><w:trPr><w:tblHeader/></w:trPr>${b.entetes.map((t,j)=>cel(t,j,true)).join('')}</w:tr>${b.lignes.map(r=>`<w:tr>${r.map((t,j)=>cel(t,j,false)).join('')}</w:tr>`).join('')}</w:tbl>`+para('',{esp:60})}
      else if(b.t==='cadre'){const bord=`<w:pBdr><w:top w:val="single" w:sz="8" w:space="4" w:color="${ac}"/><w:left w:val="single" w:sz="8" w:space="4" w:color="${ac}"/><w:bottom w:val="single" w:sz="8" w:space="4" w:color="${ac}"/><w:right w:val="single" w:sz="8" w:space="4" w:color="${ac}"/></w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="F8FAF5"/>`;
        const ps=[`<w:p><w:pPr><w:keepNext/><w:keepLines/>${bord}<w:spacing w:before="120" w:after="0"/><w:ind w:left="113" w:right="113"/></w:pPr>${run(b.titre,{b:true,coul:ac})}</w:p>`];
        b.lignes.forEach((l,i)=>ps.push(`<w:p><w:pPr>${i<b.lignes.length-1?'<w:keepNext/>':''}<w:keepLines/>${bord}<w:spacing w:before="60" w:after="0"/><w:ind w:left="113" w:right="113"/></w:pPr>${run(l)}</w:p>`));
        corps+=ps.join('')+para('',{esp:60})}
    })});
  const document=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${corps}<w:sectPr><w:footerReference w:type="default" r:id="rId3"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/>${M.pageGarde===false?'':'<w:titlePg/>'}</w:sectPr></w:body></w:document>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="fr-FR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="2400" w:after="240"/></w:pPr><w:rPr><w:b/><w:color w:val="${ac}"/><w:sz w:val="56"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:pBdr><w:bottom w:val="single" w:sz="12" w:space="4" w:color="${ac}"/></w:pBdr><w:spacing w:before="0" w:after="200"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="${ac}"/><w:sz w:val="36"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="${ac}"/><w:sz w:val="25"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="40"/><w:ind w:left="567" w:hanging="283"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:rPr><w:sz w:val="16"/><w:color w:val="5A6475"/></w:rPr></w:style>
</w:styles>`;
  const lvl=(fmt,txt)=>`<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/><w:lvlText w:val="${txt}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="567" w:hanging="283"/></w:pPr>${fmt==='bullet'?'<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr>':`<w:rPr><w:b/><w:color w:val="${ac}"/></w:rPr>`}</w:lvl>`;
  const numbering=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0">${lvl('bullet','•')}</w:abstractNum><w:abstractNum w:abstractNumId="1">${lvl('decimal','%1.')}</w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>${nums.map(n=>`<w:num w:numId="${n}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>`).join('')}</w:numbering>`;
  const footer=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:pStyle w:val="Footer"/><w:tabs><w:tab w:val="right" w:pos="9638"/></w:tabs></w:pPr>${run(M.pied||M.titre)}<w:r><w:tab/></w:r><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>`;
  const now=new Date().toISOString().replace(/\.\d+Z$/,'Z');
  return {
    '[Content_Types].xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`,
    '_rels/.rels':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`,
    'word/_rels/document.xml.rels':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`,
    'word/document.xml':document,'word/styles.xml':styles,'word/numbering.xml':numbering,'word/footer1.xml':footer,
    'docProps/core.xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${X(M.titre)}</dc:title><dc:subject>${X(M.sousTitre||'')}</dc:subject><dc:creator>MON EPS</dc:creator><dc:language>fr-FR</dc:language><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created></cp:coreProperties>`,
    'docProps/app.xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>MON EPS</Application></Properties>`
  };
}
/* ZIP « stocké » (sans compression) : suffisant et valide pour un .docx */
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(u){let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=CRC[(c^u[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0}
function zip(fichiers){
  const enc=new TextEncoder(),parts=[],central=[];let off=0;
  const u16=v=>[v&255,(v>>>8)&255],u32=v=>[v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255];
  Object.entries(fichiers).forEach(([nom,txt])=>{const n=enc.encode(nom),data=enc.encode(txt),c=crc32(data);
    const loc=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(c),...u32(data.length),...u32(data.length),...u16(n.length),...u16(0)]);
    parts.push(loc,n,data);
    central.push(new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(c),...u32(data.length),...u32(data.length),...u16(n.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off)]),n);
    off+=loc.length+n.length+data.length});
  const tc=central.reduce((a,b)=>a+b.length,0),nb=Object.keys(fichiers).length;
  const fin=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(nb),...u16(nb),...u32(tc),...u32(off),...u16(0)]);
  return new Blob([...parts,...central,fin],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
function docx(M){const b=zip(docxXML(M));telecharger((M.fichier||'cycle')+'.docx',b);return b}

window.EPSExport={pdf,docx,docxXML,zip};
})();

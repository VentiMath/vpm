'use strict';
// Project the selected glyphs through the web layout's semantic tree. Layout
// transforms and paint order alone cannot distinguish n^6 from n6, or 1/2
// from 12. This module needs neither the parser nor the font data on the client.
const operators={'∑':'sum','∏':'prod','∫':'int','∬':'iint','∭':'iiint','⋃':'bigcup','⋂':'bigcap','⨁':'bigoplus','⨂':'bigotimes'};
const math=value=>Array.from(value,c=>operators[c]?'\\'+operators[c]+' ':c==='−'?'-':c==='\\'?'\\backslash ':/[{}$%_#&]/.test(c)?'\\'+c:c==='^'?'\\text{^}':c==='~'?'\\text{~}':c).join('');
const text=value=>value.replace(/[\\{}$%_#&]/g,c=>'\\'+c);
const arg=value=>/^[A-Za-z0-9]$/.test(value)?value:'{'+value+'}';
const base=value=>/^(?:[A-Za-z0-9]|\\[A-Za-z]+)$/.test(value)?value:'{'+value+'}';
const join=parts=>parts.map(p=>p.tex).join('');
function selectedTex(element,range,selectedText){
 if(!element)return '';
 function read(node){
  if(node.nodeType!==1)return {tex:'',raw:''};
  const encoded=node.getAttribute('data-vlx-tex'),meta=encoded?(encoded[0]==='{'?JSON.parse(encoded):{kind:encoded}):undefined;
  if(!range.intersectsNode(node))return {tex:'',raw:'',meta};
  if(node.matches('.vlx-select')){
   const raw=[...node.childNodes].filter(n=>n.nodeType===3).map(selectedText).join('');
   return {tex:math(raw),raw};
  }
  const parts=[];
  function collect(parent){
   for(const child of parent.children){
    if(child.hasAttribute('data-vlx-tex')||child.matches('.vlx-select'))parts.push(read(child));
    else collect(child);
   }
  }
  collect(node);
  const raw=parts.map(p=>p.raw).join(''),value=join(parts);
  if(!encoded)return {tex:value,raw};
  const children=parts.filter(p=>p.meta),values=children.map(p=>p.tex.trim());
  let tex=value;
  switch(meta.kind){
   case 'space':tex=range.intersectsNode(node)?'\\hspace{'+meta.width+'em}':'';break;
   case 'linebreak':tex='\\\\ ';break;
   case 'lines':tex=values.filter(Boolean).join('\\\\ ');break;
   case 'phantom':case 'rule':tex='';break;
   case 'scripts':{
    const b=values[0]||'',sup=meta.sup?values[1]||'':'',sub=meta.sub?values[meta.sup?2:1]||'':'';
    // Selecting only an exponent/under-script copies that expression by itself.
    if(!b)tex=sup&&sub?'{}^'+arg(sup)+'_'+arg(sub):sup||sub;
    else tex=(sup||sub?base(b):b)+(sup?'^'+arg(sup):'')+(sub?'_'+arg(sub):'');
    break;
   }
   case 'fraction':case 'binomial':{
    const [a='',b='']=values;
    tex=a&&b?'\\'+(meta.kind==='binomial'?'binom':'frac')+'{'+a+'}{'+b+'}':a||b||value;break;
   }
   case 'root':tex=values[0]?'\\sqrt'+(values[1]?'['+values[1]+']':'')+'{'+values[0]+'}':values[1]||'';break;
   case 'text':{
    const command=meta.operator?'operatorname':({italic:'textit',slanted:'textsl',bold:'textbf',monospace:'texttt','small-caps':'textsc'}[meta.font]||'text');
    tex=raw?'\\'+command+'{'+text(raw)+'}':'';break;
   }
   case 'negation':tex=raw?'\\not '+math(raw.replace(/\u0338/g,'')):'';break;
   case 'font':tex=value?'\\'+meta.font+'{'+value+'}':'';break;
   case 'boldsymbol':tex=value?'\\boldsymbol{'+value+'}':'';break;
   case 'class':tex=value?'\\math'+meta.class+'{'+value+'}':'';break;
   case 'color':tex=value?'\\textcolor{'+meta.color+'}{'+value+'}':'';break;
   case 'style':tex=value?'{\\'+meta.style+' '+value+'}':'';break;
   case 'decoration':tex=value?'\\'+(meta.style==='circle'?'enclose{circle}':meta.style)+'{'+value+'}':'';break;
   case 'stack':tex=values[0]&&values[1]?'\\'+(meta.under?'underset':'overset')+'{'+values[1]+'}{'+values[0]+'}':values[0]||values[1]||'';break;
   case 'fenced':tex=values[0]?'\\left'+math(meta.left)+values[0]+'\\right'+math(meta.right):value;break;
   case 'table':{
    const cells=children.filter(p=>p.meta.kind==='cell'&&p.tex);
    if(!cells.length){tex=value;break;}
    if(cells.length===1){tex=cells[0].tex;break;}
    const start=Math.min(...cells.map(p=>p.meta.row)),end=Math.max(...cells.map(p=>p.meta.row));
    const left=Math.min(...cells.map(p=>p.meta.col)),right=Math.max(...cells.map(p=>p.meta.col+p.meta.count));
    const rows=Array.from({length:end-start+1},()=>Array(right-left).fill(''));
    for(const cell of cells)rows[cell.meta.row-start][cell.meta.col-left]=cell.tex;
    const name=['pmatrix','bmatrix','Bmatrix','vmatrix','Vmatrix','cases','smallmatrix'].includes(meta.name)?meta.name:'matrix';
    tex='\\begin{'+name+'}'+rows.map(r=>r.join('&')).join('\\\\')+'\\end{'+name+'}';break;
   }
  }
  return {tex,raw,meta};
 }
 return read(element).tex.trim();
}
exports.selectedTex=selectedTex;

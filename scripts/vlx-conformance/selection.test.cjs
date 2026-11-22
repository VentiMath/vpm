'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const vlx=require('../../packages/vlx'),{observeMath}=require('../../packages/vlx/dom.cjs');
test('partial visible selection, whole TeX, mixed prose and cleanup',()=>{
 const dom=new JSDOM('<body><p id="host">Before '+vlx.renderMath('n^6-1').html+' between '+vlx.renderMath('x_2',{display:true}).html+' after</p>');
 const w=dom.window,host=w.document.querySelector('#host'),stop=observeMath(host),widgets=host.querySelectorAll('[data-vlx="math"]');
 const glyphs=[...widgets[0].querySelectorAll('.vlx-select')].map(e=>e.firstChild);
 const select=(a,offset,b,end)=>{const r=w.document.createRange();r.setStart(a,offset);r.setEnd(b,end);w.getSelection().removeAllRanges();w.getSelection().addRange(r)};
 const copy=()=>{const values={},event=new w.Event('copy',{cancelable:true});Object.defineProperty(event,'clipboardData',{value:{setData:(k,v)=>values[k]=v}});w.document.dispatchEvent(event);return {handled:event.defaultPrevented,text:values['text/plain']}};
 try{
  select(glyphs[0],0,glyphs[1],1);assert.deepEqual(copy(),{handled:true,text:'$n^6$'});
  select(glyphs[1],0,glyphs[1],1);assert.equal(copy().text,'$6$');
  select(glyphs[0],0,glyphs[3],1);assert.equal(copy().text,'$n^6-1$');
  select(host.firstChild,3,glyphs[1],1);assert.equal(copy().text,'ore $n^6$');
  select(glyphs[2],0,host.lastChild,4);assert.equal(copy().text,'$-1$ between \\[x_2\\] aft');
  select(host,0,host,host.childNodes.length);assert.equal(copy().text,'Before $n^6-1$ between \\[x_2\\] after');
  select(host.firstChild,0,host.firstChild,3);assert.equal(copy().handled,false);
  select(glyphs[0],0,glyphs[1],1);stop();assert.equal(copy().handled,false);
 }finally{stop();w.close()}
});
test('selection text retains negation and fullwidth punctuation, exports retain paths only',()=>{
 const dom=new JSDOM();
 try{for(const [tex,expected]of [['a\\not=b','a≠b'],['a\\not\\leqslant b','a⩽̸b'],['\\text{，：}','，：']]){
  const out=vlx.renderMath(tex),host=dom.window.document.createElement('div');host.innerHTML=out.html;
  assert.equal([...host.querySelectorAll('.vlx-select')].map(e=>e.textContent).join(''),expected);
  assert.doesNotMatch(out.svg,/<text|vlx-select/);assert.match(out.mathml,/<math/);
 }}finally{dom.window.close()}
});
test('partial copies retain mathematical structure and omit unselected siblings',()=>{
 const dom=new JSDOM('<div id="host"></div>'),w=dom.window,host=w.document.querySelector('#host'),stop=observeMath(host);
 const cases=[
  ['a\\\\b+9',0,2,'a\\\\ b'],['n^{6}-1',0,2,'n^6'],['n^{123}-1',0,3,'n^{12}'],
  ['n^{6}-1',1,2,'6'],['x_2+1',0,2,'x_2'],
  ['x^{12}_{34}+9',0,5,'x^{12}_{34}'],['{x+1}^2-9',0,4,'{x+1}^2'],
  ['\\frac{1}{2}+9',0,2,'\\frac{1}{2}'],['\\frac{123}{456}+9',1,5,'\\frac{23}{45}'],
  ['\\frac{123}{456}+9',1,3,'23'],['\\frac{x^2}{y_3}+9',0,4,'\\frac{x^2}{y_3}'],
  ['\\sqrt[3]{x+1}+9',0,4,'\\sqrt[3]{x+1}'],['\\sqrt{x+1}+9',0,1,'\\sqrt{x}'],
  ['\\sum_{i=1}^{n}i^2+9',0,2,'\\sum^n'],['\\sum_{i=1}^{n}i^2+9',0,5,'\\sum^n_{i=1}'],
  ['\\binom{n}{2}+9',1,3,'\\binom{n}{2}'],['\\left(x^2+1\\right)+9',1,3,'\\left(x^2\\right)'],
  ['\\text{50\\% off}+9',0,3,'\\text{50}\\text{\\%}'],['\\textbf{cost}+9',0,2,'\\textbf{co}'],
  ['\\overline{AB}+9',0,1,'\\overline{A}'],['\\not\\leqslant+9',0,1,'\\not ⩽'],
  ['\\mathbb{R}^2+9',0,2,'{\\mathbb{ℝ}}^2'],
  ['\\begin{matrix}a&b\\\\c&d\\end{matrix}+9',0,3,'\\begin{matrix}a&b\\\\c&\\end{matrix}'],
 ];
 try{for(const [source,start,end,expected]of cases)for(const display of [false,true]){
  host.innerHTML=vlx.renderMath(source,{display}).html;
  const glyphs=[...host.querySelectorAll('.vlx-select')].map(e=>e.firstChild),r=w.document.createRange();
  r.setStart(glyphs[start],0);r.setEnd(glyphs[end-1],glyphs[end-1].length);w.getSelection().removeAllRanges();w.getSelection().addRange(r);
  let copied;const event=new w.Event('copy',{cancelable:true});Object.defineProperty(event,'clipboardData',{value:{setData:(k,v)=>copied=v}});w.document.dispatchEvent(event);
  assert.equal(copied,display?'\\['+expected+'\\]':'$'+expected+'$',source);
  assert.doesNotThrow(()=>vlx.renderMath(expected,{display}),source+' copied TeX must render');
 }}finally{stop();w.close();}
});
test('all historical outline geometry and semantics remain identical with a selectable web layer',()=>{
 const {createHash}=require('node:crypto'),canonical=require('./canonical-dom.cjs'),dom=new JSDOM(),host=dom.window.document.createElement('div');
 const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
 try{for(const c of require('./output-reference.json').cases){
  const r=vlx.renderMath(c.tex,{display:c.display});
  for(const f of ['width','height','baseline'])assert.equal(r[f],c[f],c.name+' '+f);
  for(const f of ['svg','mathml','html']){
   host.innerHTML=r[f];host.querySelectorAll('.vlx-select').forEach(e=>e.remove());host.querySelectorAll('[data-vlx-tex]').forEach(e=>e.replaceWith(...e.childNodes));
   assert.equal(digest(canonical(host.firstElementChild)),c[f],c.name+' '+f);
  }
 }}finally{dom.window.close()}
});
test('partial TeX from the rendering corpus parses and renders independently',()=>{
 const {selectedTex}=require('../../packages/vlx/selection-tex.cjs'),dom=new JSDOM(),w=dom.window,host=w.document.createElement('div');
 let checked=0;
 try{for(const [name,source]of require('./output-cases.cjs')){
  host.innerHTML=vlx.renderMath(source).html;
  const glyphs=[...host.querySelectorAll('.vlx-select')].map(e=>e.firstChild),length=glyphs.length;
  if(length<2)continue;
  for(const [start,end]of [[0,1],[0,Math.ceil(length/2)],[Math.floor(length/2),length],[length-1,length],[1,length-1]]){
   if(start>=end)continue;
   const r=w.document.createRange();r.setStart(glyphs[start],0);r.setEnd(glyphs[end-1],glyphs[end-1].length);
   const copied=selectedTex(host.querySelector('svg'),r,node=>{
    if(!r.intersectsNode(node))return '';
    return node.nodeValue.slice(node===r.startContainer?r.startOffset:0,node===r.endContainer?r.endOffset:node.length);
   });
   assert.notEqual(copied,'',name+' must retain selected content');
   assert.doesNotThrow(()=>vlx.renderMath(copied),name+' '+start+':'+end+' '+copied);checked++;
  }
 }}finally{w.close();}
 assert(checked>200);
});

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
  select(glyphs[0],0,glyphs[1],1);assert.deepEqual(copy(),{handled:true,text:'n6'});
  select(glyphs[1],0,glyphs[1],1);assert.equal(copy().text,'6');
  select(glyphs[0],0,glyphs[3],1);assert.equal(copy().text,'$n^6-1$');
  select(host.firstChild,3,glyphs[1],1);assert.equal(copy().text,'ore n6');
  select(glyphs[2],0,host.lastChild,4);assert.equal(copy().text,'−1 between \\[x_2\\] aft');
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
test('all historical outline geometry and semantics remain identical with a selectable web layer',()=>{
 const {createHash}=require('node:crypto'),canonical=require('./canonical-dom.cjs'),dom=new JSDOM(),host=dom.window.document.createElement('div');
 const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
 try{for(const c of require('./output-reference.json').cases){
  const r=vlx.renderMath(c.tex,{display:c.display});
  for(const f of ['width','height','baseline'])assert.equal(r[f],c[f],c.name+' '+f);
  for(const f of ['svg','mathml','html']){
   host.innerHTML=r[f];host.querySelectorAll('.vlx-select').forEach(e=>e.remove());
   assert.equal(digest(canonical(host.firstElementChild)),c[f],c.name+' '+f);
  }
 }}finally{dom.window.close()}
});

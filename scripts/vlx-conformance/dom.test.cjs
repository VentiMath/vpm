'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const {observeMath,installMathStyles}=require('../../packages/vlx/dom.cjs');
test('fitting and hidden math skip computed styles, shared CSS and caller attributes survive cleanup',()=>{
 const dom=new JSDOM('<!doctype html><body><section><span data-vlx="math"></span></section></body>');
 try{
 const {window:w}=dom,el=w.document.querySelector('span'),root=w.document.querySelector('section');let width=100,scroll=100,reads=0,css='auto';
 Object.defineProperties(el,{clientWidth:{get:()=>width},scrollWidth:{get:()=>scroll}});
 w.getComputedStyle=()=>{reads++;return {overflowX:css,paddingLeft:'0',paddingRight:'0'}};
 const stop=observeMath(root);assert.equal(reads,0);assert.equal(el.getAttribute('tabindex'),null);
 width=0;scroll=200;w.dispatchEvent(new w.Event('resize'));assert.equal(reads,0);
 width=100;w.dispatchEvent(new w.Event('resize'));assert.equal(reads,1);assert.equal(el.getAttribute('tabindex'),'0');
 scroll=100;w.dispatchEvent(new w.Event('resize'));assert.equal(reads,1);assert.equal(el.getAttribute('tabindex'),null);
 scroll=200;css='hidden';w.dispatchEvent(new w.Event('resize'));assert.equal(el.getAttribute('tabindex'),null);
 css='auto';el.setAttribute('tabindex','7');w.dispatchEvent(new w.Event('resize'));stop();assert.equal(el.getAttribute('tabindex'),'7');
 installMathStyles(w.document);assert.equal(w.document.querySelectorAll('style[data-vlx-styles]').length,1);
 assert.equal(w.document.querySelector('style').textContent,fs.readFileSync(require.resolve('../../packages/vlx/styles.css'),'utf8'));
 const other=new JSDOM('<!doctype html><body></body>');try{installMathStyles(other.window.document);assert.equal(other.window.document.querySelectorAll('style').length,1)}finally{other.window.close()}
 }finally{dom.window.close()}
});

test('copy conversion leaves partially selected formulas to native selection',()=>{
 const dom=new JSDOM('<!doctype html><body><section>Before <span data-vlx="math"><svg aria-hidden="true"></svg><math><semantics><mi>abcd</mi><annotation encoding="application/x-tex">abcd</annotation></semantics></math></span> after</section></body>');
 const {window:w}=dom,root=w.document.querySelector('section'),stop=observeMath(root);
 const copy=()=>{const data=new Map(),event=new w.Event('copy',{cancelable:true});Object.defineProperty(event,'clipboardData',{value:{setData:(k,v)=>data.set(k,v)}});w.document.dispatchEvent(event);return {event,data};};
 try {
  const range=w.document.createRange();range.selectNodeContents(root);w.getSelection().addRange(range);
  const whole=copy();assert.equal(whole.event.defaultPrevented,true);assert.equal(whole.data.get('text/plain'),'Before $abcd$ after');
  w.getSelection().removeAllRanges();range.setStart(root.querySelector('mi').firstChild,2);range.setEnd(root,root.childNodes.length);w.getSelection().addRange(range);
  const partial=copy();assert.equal(partial.event.defaultPrevented,false);assert.equal(partial.data.size,0);
 }finally{stop();dom.window.close()}
});

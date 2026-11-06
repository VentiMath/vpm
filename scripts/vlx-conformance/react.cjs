'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{createRequire}=require('node:module'),{JSDOM}=require('jsdom');
const selected=createRequire(path.join(process.env.VPM_VLX_CONSUMER,'package.json'));
const React=selected('react'),api=selected('vlx/react'),h=React.createElement;
assert(!Object.keys(require.cache).some(p=>p.endsWith('/vlx/font/glyphs.json')),'Importing React entry must not load glyphs');
assert.equal(selected('react-dom/server').renderToString(h(api.MathText,{source:'<em>plain</em>'})),'<span>&lt;em&gt;plain&lt;/em&gt;</span>');
assert(!Object.keys(require.cache).some(p=>p.endsWith('/vlx/font/glyphs.json')),'Plain prose must not load glyphs');
const provided=selected('react-dom/server').renderToString(h(api.MathProvider,{loadingFallback:'Math is loading'},h(api.MathProvider,{scrollLabel:'Expression'},h(api.InlineMath,{tex:'x'}))));assert.match(provided,/Math is loading/);
const overridden=selected('react-dom/server').renderToString(h(api.MathProvider,{loadingFallback:'Hidden loading'},h(api.InlineMath,{tex:'x',loadingFallback:null})));assert.doesNotMatch(overridden,/Hidden loading/);
const initial=selected('react-dom/server').renderToString(h(api.InlineMath,{tex:'x',loadingFallback:'Loading math'}));assert.match(initial,/Loading math/);
const dom=new JSDOM('<!doctype html><body><div id="host"></div></body>',{pretendToBeVisual:true});
for(const name of ['window','document','navigator','HTMLElement','Element','Node','MutationObserver','getComputedStyle'])Object.defineProperty(globalThis,name,{configurable:true,value:dom.window[name]});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const container=document.getElementById('host'),root=selected('react-dom/client').createRoot(container),{act}=React;
const htmlDescriptor=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
Object.defineProperty(Element.prototype,'innerHTML',{...htmlDescriptor,set(){throw Error('Direct React math must not write innerHTML');}});
let copies=0;const add=document.addEventListener.bind(document),remove=document.removeEventListener.bind(document);
document.addEventListener=(type,...args)=>{if(type==='copy')copies++;return add(type,...args);};document.removeEventListener=(type,...args)=>{if(type==='copy')copies--;return remove(type,...args);};
(async()=>{try{
 await api.preloadMath();
 assert(Object.keys(require.cache).some(p=>p.endsWith('/vlx/font/glyphs.json')),'Preload resolves the deferred renderer');
 const canonical=require('./canonical-dom.cjs'),digest=value=>require('node:crypto').createHash('sha256').update(JSON.stringify(value)).digest('hex');
 const control=document.createElement('div');
 for(const c of require('./output-reference.json').cases){
  const result=selected('vlx').renderMath(c.tex,{display:c.display});
  for(const field of ['width','height','baseline'])assert.equal(result[field],c[field],c.name+' '+field);
  for(const field of ['svg','mathml','html']){htmlDescriptor.set.call(control,result[field]);assert.equal(digest(canonical(control.firstElementChild)),c[field],c.name+' serialized '+field);}
  act(()=>root.render(h(c.display?api.DisplayMath:api.InlineMath,{tex:c.tex})));
  assert.equal(digest(canonical(container.querySelector('[data-vlx="math"]'))),c.html,c.name+' direct React DOM');
  htmlDescriptor.set.call(control,selected('react-dom/server').renderToString(h(c.display?api.DisplayMath:api.InlineMath,{tex:c.tex})));
  assert.equal(digest(canonical(control.querySelector('[data-vlx="math"]'))),c.html,c.name+' React SSR');
 }
 // Check corrected indexed roots and newly supported Unicode through both
 // emitters without rewriting the historical r6 controls.
 for(const [name,tex]of [...require('./picture-corpus.cjs').roots,...require('./unicode-corpus.cjs')])for(const display of [false,true]){
  htmlDescriptor.set.call(control,selected('vlx').renderMath(tex,{display}).html);const expected=digest(canonical(control.firstElementChild));
  act(()=>root.render(h(display?api.DisplayMath:api.InlineMath,{tex})));
  assert.equal(digest(canonical(container.querySelector('.vlx-math'))),expected,name+' native React');
  htmlDescriptor.set.call(control,selected('react-dom/server').renderToString(h(display?api.DisplayMath:api.InlineMath,{tex})));
  assert.equal(digest(canonical(control.querySelector('.vlx-math'))),expected,name+' SSR');
 }
 act(()=>root.render(null));assert.equal(copies,0);
 const immediate=selected('react-dom/server').renderToString(h(api.InlineMath,{tex:'x',loadingFallback:'must not suspend'}));assert.match(immediate,/<math/);assert.doesNotMatch(immediate,/must not suspend|<template/);
 act(()=>root.render(h(api.MathProvider,{scrollLabel:'Translated formula'},h(api.InlineMath,{tex:'x'}))));assert.equal(container.querySelectorAll('math').length,1,'Preloaded math renders on its first synchronous pass');
 const formula=container.querySelector('.vlx-math');Object.defineProperties(formula,{clientWidth:{value:100},scrollWidth:{value:200}});formula.querySelector('svg').getBoundingClientRect=()=>({width:200});window.dispatchEvent(new window.Event('resize'));assert.equal(formula.getAttribute('aria-label'),'Translated formula');
 formula.focus();formula.scrollLeft=37;
 for(let tick=0;tick<10;tick++)act(()=>root.render(h(api.MathProvider,{scrollLabel:'Translated formula'},h(api.InlineMath,{tex:'x',className:'tick-'+tick,style:{color:tick%2?'red':'blue'}}))));
 assert.equal(container.querySelector('.vlx-math'),formula,'Parent updates preserve the formula element');assert.equal(document.activeElement,formula);assert.equal(formula.scrollLeft,37);assert.equal(copies,1);
 act(()=>root.render(h(api.MathProvider,{scrollLabel:'New label'},h(api.InlineMath,{tex:'x'}))));
 assert.equal(container.querySelector('.vlx-math'),formula,'A provider change preserves formula identity');assert.equal(formula.getAttribute('aria-label'),'New label');assert.equal(copies,1);
 act(()=>root.render(h(api.MathProvider,null,h(api.InlineMath,{tex:'y'}))));
 assert.equal(container.querySelector('.vlx-math'),formula,'Changed TeX reconciles the existing formula');assert.match(container.querySelector('math').textContent,/y/);assert.equal(copies,1);
 const source=String.raw`Before <em>literal</em> $x^2$ then $\missingCommand$ then $y+1$ and $open`;
 await act(async()=>{root.render(h(React.StrictMode,null,h(api.MathText,{source})));});
 assert.equal(document.querySelectorAll('style[data-vlx-styles]').length,1);
 assert.equal(container.querySelectorAll('math').length,2);assert.equal(container.querySelector('em'),null);assert.match(container.textContent,/\$\\missingCommand\$/);assert.match(container.textContent,/\$open/);assert.equal(copies,2,'StrictMode cleans up its first lifecycle');
 const siblings=Array.from(container.querySelectorAll('[data-vlx="math"]'));
 await act(async()=>root.render(h(React.StrictMode,null,h(api.MathText,{source,className:'updated',fallback:()=>h('strong',null,'Updated fallback')}))));
 const updated=Array.from(container.querySelectorAll('[data-vlx="math"]'));assert.equal(updated.length,siblings.length);siblings.forEach((node,i)=>assert.equal(updated[i],node,'MathText keeps unchanged formulas while updating its error fallback'));assert.equal(container.querySelector('strong').textContent,'Updated fallback');assert.equal(copies,2);
 await act(async()=>root.render(h(api.MathText,{source:String.raw`$\unknown$`,fallback:(_error,raw)=>h('strong',null,'Invalid: '+raw)})));
 assert.equal(copies,0);assert.match(container.querySelector('strong').textContent,/Invalid/);
 await act(async()=>root.render(h(api.DisplayMath,{tex:'x+1',style:{'--vlx-scale':1.3}})));assert.equal(copies,1);assert.equal(container.querySelector('.vlx-math').dataset.vlxDisplay,'true');
 await act(async()=>root.render(h(api.InlineMath,{tex:'x',scrollLabel:'Scrollable formula'})));assert.equal(copies,1);assert.equal(container.querySelector('.vlx-math').dataset.vlxDisplay,'false');
 await act(async()=>root.render(h(api.InlineMath,{tex:String.raw`\unknown`,fallback:null})));assert.equal(container.textContent,'');assert.equal(copies,0);
 await act(async()=>root.unmount());assert.equal(copies,0);
 const hydratedHost=document.createElement('div');document.body.append(hydratedHost);
 htmlDescriptor.set.call(hydratedHost,selected('react-dom/server').renderToString(h(api.MathText,{source:'Hydrate $x^2$.'})));
 const serverFormula=hydratedHost.querySelector('[data-vlx="math"]'),errors=[];let hydrated;
 await act(async()=>{hydrated=selected('react-dom/client').hydrateRoot(hydratedHost,h(api.MathText,{source:'Hydrate $x^2$.'}),{onRecoverableError:error=>errors.push(error)});});
 assert.deepEqual(errors,[]);assert.equal(hydratedHost.querySelector('[data-vlx="math"]'),serverFormula,'Hydration reuses server math');
 await act(async()=>hydrated.render(h(api.MathText,{source:'Hydrate $x^2$.',className:'timer-tick'})));
 assert.equal(hydratedHost.querySelector('[data-vlx="math"]'),serverFormula,'Updates after hydration preserve server math');
 await act(async()=>hydrated.unmount());assert.equal(copies,0);hydratedHost.remove();
 console.log('React: 114 unchanged r6 controls and 18 indexed-root/Unicode cases match string, direct DOM and SSR output; innerHTML writes prohibited; stable formula DOM, changed TeX/fallbacks, lazy loading, hydration, shared styles, StrictMode and cleanup pass.');
}finally{Object.defineProperty(Element.prototype,'innerHTML',htmlDescriptor);dom.window.close();}})().catch(error=>{console.error(error);process.exitCode=1});

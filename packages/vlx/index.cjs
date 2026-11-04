'use strict';
const {parse,escape,VlxError}=require('./source.cjs');
const {parseMath}=require('./tex.cjs');
const {layout}=require('./layout.cjs');
function normalized(options) {
 const display=options.display??false,fontSize=options.fontSize??undefined;
 if(fontSize!==undefined&&(!Number.isFinite(fontSize)||fontSize<=0||fontSize>256))throw new RangeError('fontSize must be positive and at most 256');
 if(typeof display!=='boolean')throw new TypeError('display must be boolean');
 return {display,fontSize};
}
function renderMath(tex,options={}) {
 const checked=normalized(options),fontSize=checked.fontSize??16,display=checked.display;
 const ast=parseMath(tex),b=layout(ast,{display}),pad=.08,w=b.w+pad*2,h=b.h+b.d+pad*2;
 if(!Number.isFinite(w)||!Number.isFinite(h)||w>4096||h>4096||w<=0||h<=0)throw new VlxError('LIMIT','Layout exceeds the supported bounds');
 const round=x=>Number(x.toFixed(5)),width=round(w*fontSize),height=round(h*fontSize),baseline=round((b.h+pad)*fontSize);
 const inner=`<g transform="translate(${pad} ${round(b.h+pad)})">${b.svg}</g>`;
 const attrs=`xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${round(w)} ${round(h)}"`;
 const svg=`<svg ${attrs} width="${width}" height="${height}"><title>${escape(tex)}</title><g color="black">${inner}</g></svg>`;
 const mathml=`<math xmlns="http://www.w3.org/1998/Math/MathML" display="${display?'block':'inline'}"><semantics>${b.mml}<annotation encoding="application/x-tex">${escape(tex)}</annotation></semantics></math>`;
 const contrast='<style>@media (forced-colors:active){.vlx-math [color]{color:CanvasText}}</style>';
 const webSvg=`<svg ${attrs} width="${round(w)}em" height="${round(h)}em" style="display:block;max-width:none" aria-hidden="true" focusable="false">${contrast}${inner}</svg>`;
 const html=`<span class="vlx-math" data-vlx="math" data-vlx-display="${display}" style="position:relative;max-width:100%;min-width:0;${display?'display:block;overflow-x:auto;':'display:inline-block;overflow-x:auto;vertical-align:'+round(-(b.d+pad))+'em;'}font-size:${checked.fontSize===undefined?'inherit':fontSize+'px'}">${webSvg}<span style="position:absolute;left:0;top:0;width:1px;height:1px;padding:0;border:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;user-select:none">${mathml}</span></span>`;
 return Object.freeze({tex,display,svg,html,mathml,width,height,baseline});
}
function createRenderer(options={}) {
 const entries=options.cacheEntries??128,maxBytes=options.cacheBytes??2097152;
 for(const [name,n,max] of [['cacheEntries',entries,4096],['cacheBytes',maxBytes,16777216]])if(!Number.isSafeInteger(n)||n<0||n>max)throw new RangeError(`${name} is outside its supported range`);
 const cache=new Map();let bytes=0;
 function math(tex,settings={}){
  // Validate before constructing a potentially oversized cache key.
  if(typeof tex!=='string')throw new TypeError('TeX must be a string');
  if(tex.length>16384)throw new VlxError('LIMIT','At most 16384 TeX characters are supported');
  const checked=normalized(settings),key=JSON.stringify([tex,checked.display,checked.fontSize??null]);
  if(cache.has(key)){const item=cache.get(key);cache.delete(key);cache.set(key,item);return item.value;}
  const value=renderMath(tex,checked),size=(key.length+value.svg.length+value.html.length+value.mathml.length)*2;
  if(entries&&size<=maxBytes){cache.set(key,{value,size});bytes+=size;while(cache.size>entries||bytes>maxBytes){const key=cache.keys().next().value;bytes-=cache.get(key).size;cache.delete(key);}}
  return value;
 }
 function renderText(source,settings={}){
  const document=parse(source);
  if(document.diagnostics.length)throw new VlxError('UNCLOSED_MATH',document.diagnostics[0].message,{start:document.diagnostics[0].start});
  const nodes=document.nodes.map(node=>node.kind==='text'?{...node,html:escape(node.value)}:{...node,...math(node.tex,{...settings,display:node.display})});
  return {source,nodes,html:nodes.map(n=>n.html).join('')};
 }
 return {renderMath:math,renderText,clearCache(){cache.clear();bytes=0;}};
}
exports.parse=parse;
exports.parseMath=parseMath;
exports.renderMath=renderMath;
exports.createRenderer=createRenderer;
exports.VlxError=VlxError;

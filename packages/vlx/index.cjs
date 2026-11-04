'use strict';
const {parse,escape,VlxError}=require('./source.cjs');
const {parseMath}=require('./tex.cjs');
const {renderStrings}=require('./render-tree.cjs');
const {mathCache}=require('./math-cache.cjs');
function renderMath(tex,options={}) {
 return Object.freeze(renderStrings(tex,options));
}
function createRenderer(options={}) {
 const {math,clearCache}=mathCache(renderMath,value=>(value.svg.length+value.html.length+value.mathml.length)*2,options);
 function renderText(source,settings={}){
  const errorMode=settings.errorMode??'throw';if(errorMode!=='throw'&&errorMode!=='source')throw new TypeError('errorMode must be throw or source');
  const document=parse(source);
  if(document.diagnostics.length&&errorMode==='throw')throw new VlxError('UNCLOSED_MATH',document.diagnostics[0].message,{start:document.diagnostics[0].start});
  const diagnostics=[...document.diagnostics],nodes=document.nodes.map(node=>{
   if(node.kind==='text')return {...node,html:escape(node.value)};
   try{return {...node,...math(node.tex,{...settings,display:node.display})};}
   catch(error){if(errorMode==='throw'||!(error instanceof VlxError))throw error;diagnostics.push({code:error.code,message:error.message,start:node.start,end:node.end});return {...node,error,html:escape(node.raw)};}
  });
  return {source,nodes,diagnostics,html:nodes.map(n=>n.html).join('')};
 }
 return {renderMath:math,renderText,clearCache};
}
exports.parse=parse;
exports.parseMath=parseMath;
exports.renderMath=renderMath;
exports.createRenderer=createRenderer;
exports.VlxError=VlxError;

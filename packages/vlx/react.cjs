'use strict';
const React=require('react');
const {parse,VlxError}=require('./source.cjs');
// Keep the parser and glyph pool outside the initial React entry. Bundlers that
// support dynamic imports split this into a chunk requested on first use.
let pending;
function preloadMath(){return pending||(pending=import('./react-renderer.mjs'));}
const Loaded=React.lazy(()=>preloadMath().then(module=>({default:module.default})));
function component(mode){
 return function VentiLaTeX({loadingFallback,...props}){
  const source=mode==='text'?props.source:props.tex;
  const plain=React.useMemo(()=>{
   if(mode!=='text')return null;
   try{const document=parse(source);return document.nodes.some(n=>n.kind==='math')?null:document.nodes.map(n=>n.value).join('');}
   catch(error){if(error instanceof VlxError)return null;throw error;}
  },[source]);
  if(plain!==null)return React.createElement('span',{className:props.className,style:props.style},plain);
  const fallback=loadingFallback===undefined?React.createElement('span',null,source):loadingFallback;
  return React.createElement(React.Suspense,{fallback},React.createElement(Loaded,{...props,mode}));
 };
}
exports.InlineMath=component('inline');
exports.DisplayMath=component('display');
exports.MathText=component('text');
exports.preloadMath=()=>preloadMath().then(()=>undefined);

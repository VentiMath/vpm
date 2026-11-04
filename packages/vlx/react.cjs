'use strict';
const React=require('react');
const {parse,VlxError}=require('./source.cjs');
// Keep the parser and glyph pool outside the initial React entry. Bundlers that
// support dynamic imports split this into a chunk requested on first use.
let pending,resolved;
const Defaults=React.createContext({});
function MathProvider({children,scrollLabel,loadingFallback}){
 const parent=React.useContext(Defaults);
 const value=React.useMemo(()=>({...parent,...(scrollLabel===undefined?{}:{scrollLabel}),...(loadingFallback===undefined?{}:{loadingFallback})}),[parent,scrollLabel,loadingFallback]);
 return React.createElement(Defaults.Provider,{value},children);
}
function preloadMath(){return pending||(pending=import('./react-renderer.mjs').then(module=>{resolved=module.default;return module;}));}
const Loaded=React.lazy(()=>preloadMath().then(module=>({default:module.default})));
function component(mode){
 return function VentiLaTeX({loadingFallback,...props}){
  const defaults=React.useContext(Defaults);
  const label=props.scrollLabel===undefined?defaults.scrollLabel:props.scrollLabel;
  const loading=loadingFallback===undefined?defaults.loadingFallback:loadingFallback;
  const source=mode==='text'?props.source:props.tex;
  const plain=React.useMemo(()=>{
   if(mode!=='text')return null;
   try{const document=parse(source);return document.nodes.some(n=>n.kind==='math')?null:document.nodes.map(n=>n.value).join('');}
   catch(error){if(error instanceof VlxError)return null;throw error;}
  },[source]);
  if(plain!==null)return React.createElement('span',{className:props.className,style:props.style},plain);
  if(resolved)return React.createElement(resolved,{...props,scrollLabel:label,mode});
  const fallback=loading===undefined?React.createElement('span',null,source):loading;
  return React.createElement(React.Suspense,{fallback},React.createElement(Loaded,{...props,scrollLabel:label,mode}));
 };
}
exports.InlineMath=component('inline');
exports.DisplayMath=component('display');
exports.MathText=component('text');
exports.preloadMath=()=>preloadMath().then(()=>undefined);
exports.MathProvider=MathProvider;

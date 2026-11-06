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
// Keep the same component and Suspense boundary before and after loading. A
// lazy-to-direct component switch would remount math on the next parent update.
function Loaded(props){
 const Renderer=resolved||React.use(preloadMath()).default;
 return React.createElement(Renderer,props);
}
function component(mode){
 return function VentiLaTeX({loadingFallback,...props}){
  const defaults=React.useContext(Defaults);
  const label=props.scrollLabel===undefined?defaults.scrollLabel:props.scrollLabel;
  const loading=loadingFallback===undefined?defaults.loadingFallback:loadingFallback;
  const source=mode==='text'||mode==='document'?props.source:props.tex;
  const plain=React.useMemo(()=>{
   if(mode!=='text')return null;
   try{const document=parse(source);return document.nodes.some(n=>n.kind==='math')?null:document.nodes.map(n=>n.value).join('');}
   catch(error){if(error instanceof VlxError)return null;throw error;}
  },[source]);
  if(plain!==null)return React.createElement('span',{className:props.className,style:props.style},plain);
  const fallback=loading===undefined?React.createElement('span',null,source):loading;
  return React.createElement(React.Suspense,{fallback},React.createElement(Loaded,{...props,scrollLabel:label,mode}));
 };
}
exports.InlineMath=component('inline');
exports.DisplayMath=component('display');
exports.MathText=component('text');
exports.preloadMath=()=>preloadMath().then(()=>undefined);
exports.MathProvider=MathProvider;

const Document=component('document');
exports.MathDocument=function MathDocument({idPrefix,...props}){const id=React.useId();return React.createElement(Document,{...props,idPrefix:idPrefix??('vlx-'+id.replace(/[^A-Za-z0-9_-]/g,'_'))});};

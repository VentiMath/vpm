'use strict';
const React=require('react'),{parse,VlxError}=require('./source.cjs'),{observeMath}=require('./dom.cjs');
const {renderNodes}=require('./render-tree.cjs'),{mathCache}=require('./math-cache.cjs'),{weight}=require('./nodes.cjs');
// No HTML parsing, DOM insertion or generated-source evaluation. SVG and MathML
// elements enter React's normal reconciliation with stable sibling keys.
function reactNode(node,key=0){
 if(node==null||typeof node==='string')return node;
 if(Array.isArray(node))return node.map((child,i)=>reactNode(child,i));
 // MathML inline-style objects are unsupported by some DOM implementations
 // (including jsdom). This fixed rule has the same browser/SSR presentation.
 const props=node.tag==='mstyle'&&node.props?.style?.fontStyle==='oblique'?{...node.props,style:undefined,className:'vlx-slanted'}:node.props;
 return React.createElement(node.tag,{...props,key},...node.children.map((child,i)=>reactNode(child,i)));
}
const renderer=mathCache((tex,options)=>{
 const html=renderNodes(tex,options).html;
 return {tree:reactNode(html),weight:weight(html)};
},value=>value.weight);
const Mounted=React.memo(function Mounted({tree,scrollLabel}){
 const root=React.useRef(null);
 React.useEffect(()=>root.current?observeMath(root.current,{scrollLabel}):undefined,[tree,scrollLabel]);
 return React.createElement('span',{ref:root},tree);
});
module.exports=function MathRenderer({mode,tex,source,fontSize,fallback,scrollLabel,className,style,numbering,startNumber,idPrefix}){
 const result=React.useMemo(()=>{
  try{
   if(mode==='document'){const result=require('./equations.cjs').renderDocument(source,{fontSize,numbering,startNumber,idPrefix,errorMode:'source'},renderNodes,require('./nodes.cjs'));return {nodes:result.nodes.map(node=>({...node,tree:reactNode(node.html)}))};}
   if(mode!=='text')return renderer.math(tex,{display:mode==='display',fontSize});
   return {nodes:parse(source).nodes.map(node=>{
    if(node.kind==='text')return node;
    try{return {...node,...renderer.math(node.tex,{display:node.display,fontSize})};}
    catch(error){if(!(error instanceof VlxError))throw error;return {...node,error};}
   })};
  }catch(error){if(!(error instanceof VlxError))throw error;return {error};}
 },[mode,tex,source,fontSize,numbering,startNumber,idPrefix]);
 const failed=(error,raw)=>typeof fallback==='function'?fallback(error,raw):fallback===undefined?raw:fallback;
 let children;
 if(result.error)children=failed(result.error,mode==='text'||mode==='document'?source:tex);
 else if(mode==='document')children=result.nodes.map(node=>React.createElement(React.Fragment,{key:node.equations?.[0]?.id??node.start},node.error&&fallback!==undefined?React.createElement('span',{className:'vlx-equation',style:{position:'relative',display:'block'}},(node.equations||[]).map(eq=>React.createElement('span',{key:eq.id,id:eq.id,tabIndex:-1,className:'vlx-equation-target',role:'group','aria-label':'Equation '+eq.displayTag},'\u200b')),failed(node.error,node.raw)):node.kind==='text'?node.value:React.createElement(Mounted,{tree:node.tree,scrollLabel})));
 else if(mode==='text')children=result.nodes.map(node=>React.createElement(React.Fragment,{key:node.start},node.kind==='text'?node.value:node.error?failed(node.error,node.raw):React.createElement(Mounted,{tree:node.tree,scrollLabel})));
 else children=React.createElement(Mounted,{tree:result.tree,scrollLabel});
 return React.createElement('span',{className,style},children);
};

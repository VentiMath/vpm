'use strict';
const React=require('react'),{createRenderer,VlxError}=require('./index.cjs'),{observeMath}=require('./dom.cjs');
const renderer=createRenderer();
function Mounted({html,scrollLabel}){
 const root=React.useRef(null);
 // React compares this prop by identity. Replacing it would replace the math
 // subtree even when its string is unchanged, losing keyboard focus and scroll.
 const inner=React.useMemo(()=>({__html:html}),[html]);
 React.useEffect(()=>root.current?observeMath(root.current,{scrollLabel}):undefined,[html,scrollLabel]);
 return React.createElement('span',{ref:root,dangerouslySetInnerHTML:inner});
}
module.exports=function MathRenderer({mode,tex,source,fontSize,fallback,scrollLabel,className,style}){
 const result=React.useMemo(()=>{
  try{return mode==='text'?renderer.renderText(source,{fontSize,errorMode:'source'}):renderer.renderMath(tex,{display:mode==='display',fontSize});}
  catch(error){if(!(error instanceof VlxError))throw error;return {error};}
 },[mode,tex,source,fontSize]);
 const failed=(error,raw)=>typeof fallback==='function'?fallback(error,raw):fallback===undefined?raw:fallback;
 let children;
 if(result.error)children=failed(result.error,mode==='text'?source:tex);
 else if(mode==='text')children=result.nodes.map(node=>React.createElement(React.Fragment,{key:node.start},node.kind==='text'?node.value:node.error?failed(node.error,node.raw):React.createElement(Mounted,{html:node.html,scrollLabel})));
 else children=React.createElement(Mounted,{html:result.html,scrollLabel});
 return React.createElement('span',{className,style},children);
};

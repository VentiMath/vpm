import React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {MathText,InlineMath,DisplayMath,MathProvider,preloadMath} from 'vlx/react';

const h=React.createElement,root=createRoot(document.getElementById('root'));
const wide=Array.from({length:60},(_,i)=>`x_{${i}}`).join('+');
let state={tick:0,tex:wide,label:'Scrollable expression'};
class FailureBoundary extends React.Component{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?h('output',{'data-load-error':true},'Renderer unavailable'):this.props.children;}
}
const paper=()=>h(FailureBoundary,null,h(Paper,state));
function Paper({tick,tex,label}){
 return h(MathProvider,{scrollLabel:label},
  h('output',null,tick),
  h('div',{'data-case':'display',style:{width:240}},h(DisplayMath,{tex,style:{color:tick%2?'#222':'#111'}})),
  h('div',{'data-case':'inline',style:{width:240}},h(InlineMath,{tex,className:'tick-'+tick})),
  h('div',{'data-case':'text',style:{width:240}},h(MathText,{source:`Find $${tex}$ and $x^2$.`})),
 );
}
window.mountMath=async()=>{
 if(new URLSearchParams(location.search).has('preloaded'))await preloadMath();
 flushSync(()=>root.render(paper()));
};
window.updateMath=changes=>{
 state={...state,...changes,tick:state.tick+1};
 flushSync(()=>root.render(paper()));
};
window.unmountMath=()=>flushSync(()=>root.unmount());
root.render(h(MathText,{source:'Plain prose'}));
window.ready=true;

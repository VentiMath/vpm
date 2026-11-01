import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {useFloating,offset,flip,shift,limitShift,autoUpdate} from '@floating-ui/react-dom';

export async function run() {
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);let current,started=0,stopped=0;
 const placements=['top','right','bottom','left'].flatMap(side=>[side,side+'-start',side+'-end']);
 function mounted(reference,floating,update){started++;const stop=autoUpdate(reference,floating,update);return()=>{stopped++;stop();};}
 function App({placement,kind,transform}) {
  const middleware=React.useMemo(()=>[
   offset(4),flip(kind==='popover'?{fallbackAxisSideDirection:'end',crossAxis:false}:kind==='tooltip'?{fallbackAxisSideDirection:'start',crossAxis:placement.includes('-'),padding:4}:{}),
   shift(kind==='popover'?{limiter:limitShift({offset:4})}:{padding:4}),
  ],[placement,kind]);
  current=useFloating({placement,middleware,transform,whileElementsMounted:mounted});
  return React.createElement(React.Fragment,null,
   React.createElement('button',{ref:current.refs.setReference,style:{position:'fixed',left:75,top:60,width:120,height:32}},'Anchor'),
   React.createElement('div',{ref:current.refs.setFloating,style:{...current.floatingStyles,width:80,height:40}},'Panel'));
 }
 const positions=[];
 try{
  for(const kind of ['popover','tooltip','dropdown'])for(const placement of placements)for(const transform of [false,true]) {
   flushSync(()=>root.render(React.createElement(App,{key:positions.length,placement,kind,transform})));
   for(let n=0;!current.isPositioned&&n<100;n++)await new Promise(resolve=>setTimeout(resolve,1));
   if(!current.isPositioned)throw Error('Position did not settle');
   positions.push({kind,requested:placement,transform,x:current.x,y:current.y,placement:current.placement,styles:current.floatingStyles});
  }
 }finally{flushSync(()=>root.unmount());host.remove();}
 if(started!==stopped)throw Error('Subscription leaked');
 return {positions,subscriptions:started};
}

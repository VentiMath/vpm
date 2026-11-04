import React from 'react';
import {createRoot,hydrateRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {renderToString} from 'react-dom/server';
import {useIsHydrated} from '@radix-ui/react-use-is-hydrated';
import * as Roving from '@radix-ui/react-roving-focus';
const h=React.createElement,check=(x,m)=>{if(!x)throw Error(m);};
const until=async(test,label)=>{for(let i=0;i<100;i++){if(test())return;await new Promise(r=>setTimeout(r,10));}throw Error('did not settle: '+label);};
window.runChecks=async()=>{
 const host=document.getElementById('root'),roots=[],hosts=[],checks=[];let values=[];
 function State(){const value=useIsHydrated();values.push(value);return h('output',null,String(value));}
 const tree=h(React.StrictMode,null,h(State));
 try{
  const root=createRoot(host);roots.push(root);flushSync(()=>root.render(tree));check(values.every(Boolean),'client state');checks.push('client first render');
  check(renderToString(tree)==='<output>false</output>','SSR remains false');checks.push('server snapshot after client mount');
  for(let i=0;i<2;i++){
   const target=document.createElement('div');hosts.push(target);document.body.append(target);target.innerHTML=renderToString(tree);const before=target.firstChild;values=[];const errors=[];
   const r=hydrateRoot(target,tree,{onRecoverableError:e=>errors.push(e)});roots.push(r);await until(()=>target.textContent==='true','hook root');check(values[0]===false&&values.at(-1)===true,'root-local hydration');check(target.firstChild===before&&!errors.length,'hydration identity');
  }checks.push('two independent hydration roots');checks.push('no hydration mismatch or remount');
  flushSync(()=>root.render(null));
  const target=document.createElement('div');hosts.push(target);document.body.append(target);
  let entries=0;const caller=h(Roving.Root,{orientation:'horizontal',onEntryFocus:()=>entries++},h(Roving.Item,{tabStopId:'one',asChild:true},h('button',null,'one')));target.innerHTML=renderToString(caller);const group=target.firstChild;check(group.tabIndex===-1,'SSR roving tab count');
  const r=hydrateRoot(target,caller);roots.push(r);await until(()=>group.tabIndex===0,'caller tab count');await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));group.focus();await until(()=>document.activeElement===group.firstChild,'caller entry focus '+JSON.stringify({entries,html:group.outerHTML,active:document.activeElement?.outerHTML}));checks.push('unchanged Roving Focus hydration and entry');
  return {passed:true,checks};
 }finally{for(const r of roots)flushSync(()=>r.unmount());for(const x of hosts)x.remove();}
};

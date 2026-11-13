import React, {useState,useEffect,startTransition,Suspense} from 'react';
import {createRoot,hydrateRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import * as S from 'scheduler';
const wait = ms => new Promise(resolve=>setTimeout(resolve,ms));
const check=(yes,message)=>{if(!yes)throw Error(message)};
async function until(fn,label) {for(let i=0;i<500;i++){if(fn())return;await wait(10)}throw Error('Timed out: '+label)}
window.runScheduler = async () => {
  const trace=[];let actions,cleanups=0,effects=0,renders=0,interrupt=true,interrupted;
  const interruptedRender=new Promise(r=>{interrupted=r});
  const host=document.createElement('main');document.body.append(host);
  function Row({n}) {renders++;if(n===10 && interrupt){interrupt=false;setTimeout(()=>{trace.push(['yield',renders>0 && renders<700 && host.querySelectorAll('li').length<700]);flushSync(()=>{actions.setText('AMC');actions.clear()});interrupted()},0);} const until=performance.now()+0.04;while(performance.now()<until){};return <li>{n}</li>}
  function App(){const [count,setCount]=useState(0),[text,setText]=useState('contest');
    actions={grow:()=>startTransition(()=>setCount(700)),clear:()=>setCount(0),setText};
    useEffect(()=>{effects++;return()=>{cleanups++}},[]);
    return <><input aria-label="Contest search" value={text} onChange={e=>setText(e.target.value)}/><output>{text}:{count}</output><ul>{Array.from({length:count},(_,i)=><Row key={i} n={i}/>)}</ul></>;
  }
  const root=createRoot(host);root.render(<App/>);
  await until(()=>host.querySelector('input'),'mount');await until(()=>effects===1,'effect');
  const input=host.querySelector('input');input.focus();input.setSelectionRange(1,3);
  actions.grow();
  // Timer work gets a host turn while the low-priority React tree is incomplete.
  await interruptedRender;
  await wait(80);
  check(host.querySelectorAll('li').length===0,'superseded transition committed');
  check(host.querySelector('output').textContent==='AMC:0','urgent input lost');
  check(document.activeElement===input && input===host.querySelector('input'),'focused input replaced');
  actions.grow();await until(()=>host.querySelectorAll('li').length===700,'transition completion');
  trace.push(['transition',host.querySelector('output').textContent]);
  let release,ready=false;
  const promise=new Promise(r=>{release=()=>{ready=true;r()}});
  function Async(){if(!ready)throw promise;return <strong>Contest loaded</strong>}
  root.render(<Suspense fallback={<p>Loading contest</p>}><Async/></Suspense>);
  await until(()=>host.querySelector('p'),'suspense fallback');release();
  await until(()=>host.querySelector('strong'),'suspense retry');trace.push(['suspense',host.textContent]);
  root.unmount();check(cleanups===1,'effect cleanup');host.remove();
  const hydration=document.createElement('section');hydration.innerHTML='<button>Calendar</button>';document.body.append(hydration);
  const button=hydration.firstChild,errors=[];let hydrated=false;
  function Hydrated(){useEffect(()=>{hydrated=true},[]);return <button>Calendar</button>}
  const hr=hydrateRoot(hydration,<Hydrated/>,{onRecoverableError:e=>errors.push(e.message)});
  await until(()=>hydrated,'hydration');check(hydration.firstChild===button,'hydration replaced node');check(errors.length===0,errors.join('\n'));hr.unmount();hydration.remove();
  trace.push(['hydration','same node']);
  const scheduled=[];
  const cancel=S.unstable_scheduleCallback(S.unstable_NormalPriority,()=>scheduled.push('cancelled'),{delay:30});S.unstable_cancelCallback(cancel);
  S.unstable_scheduleCallback(S.unstable_NormalPriority,()=>{scheduled.push('normal');S.unstable_requestPaint();return()=>scheduled.push('continued')});
  S.unstable_scheduleCallback(S.unstable_ImmediatePriority,()=>scheduled.push('immediate'));
  await until(()=>scheduled.includes('continued'),'scheduler completion');await wait(40);
  check(JSON.stringify(scheduled)===JSON.stringify(['immediate','normal','continued']),'browser ordering '+scheduled);
  trace.push(['host',scheduled]);
  check(globalThis.__schedulerStats.scheduled>3 && globalThis.__schedulerStats.executed>3,'React did not use the substituted scheduler');
  check(trace[0][1]===true,'React transition blocked the timer');
  return {trace,stats:globalThis.__schedulerStats,renders,cleanups};
};

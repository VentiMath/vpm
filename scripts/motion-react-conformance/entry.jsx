import React from 'react';
import {createRoot,hydrateRoot} from 'react-dom/client';
import {Scenario,SSRScene} from './scene.jsx';
const host=document.createElement('div');document.body.append(host);let root;
window.mountMotion=(props={},strict=false)=>{root?.unmount();root=createRoot(host);window.updateMotion=(next=props)=>root.render(strict?<React.StrictMode><Scenario {...next}/></React.StrictMode>:<Scenario {...next}/>);window.updateMotion();};
window.unmountMotion=()=>{root?.unmount();root=null;};
window.hydrateMotion=async html=>{
 root?.unmount();host.innerHTML=html;const before=[...host.querySelectorAll('div')],errors=[];
 root=hydrateRoot(host,<SSRScene count={3}/>,{onRecoverableError:e=>errors.push(e.message)});
 await new Promise(r=>setTimeout(r,180));return {same:before.every((n,i)=>n===host.querySelectorAll('div')[i]),errors};
};

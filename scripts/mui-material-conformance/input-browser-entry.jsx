import React from 'react';
import {createRoot,hydrateRoot} from 'react-dom/client';
import {InputScene,HydrationScene,ForeignScene} from './input-scene.jsx';
const delivered=document.querySelector('#hydration');
if(delivered){
 const before=[...delivered.querySelectorAll('label,input,p')],errors=[];
 hydrateRoot(delivered,<HydrationScene/>,{onRecoverableError:e=>errors.push(e.message)});
 window.hydrationReady=new Promise(resolve=>setTimeout(()=>resolve({same:before.every((n,i)=>n===delivered.querySelectorAll('label,input,p')[i]),errors}),100));
}else{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 window.renderForms=props=>root.render(<React.StrictMode><InputScene {...props}/></React.StrictMode>);window.renderForms({});
 window.unmountForms=()=>root.unmount();
}

window.mountForeignInput=noObserver=>{const frame=document.createElement('iframe');frame.width=300;document.body.append(frame);if(noObserver)frame.contentWindow.ResizeObserver=undefined;const doc=frame.contentDocument,host=doc.createElement('div');doc.body.append(host);const root=createRoot(host);root.render(<ForeignScene doc={doc}/>);window.foreignInput={frame,root,doc};};
window.unmountForeignInput=()=>{const {root,doc}=window.foreignInput;root.unmount();return {inputs:doc.querySelectorAll('textarea').length,mirrors:doc.querySelectorAll('[data-vpm-input-measure]').length};};

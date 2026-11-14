import React from 'react';
import {createRoot,hydrateRoot} from 'react-dom/client';
import {FormsScene,HydrationScene} from './forms-scene.jsx';
const delivered=document.querySelector('#hydration');
if(delivered){
 const before=[...delivered.querySelectorAll('label,input,p')],errors=[];
 hydrateRoot(delivered,<HydrationScene/>,{onRecoverableError:e=>errors.push(e.message)});
 window.hydrationReady=new Promise(resolve=>setTimeout(()=>resolve({same:before.every((n,i)=>n===delivered.querySelectorAll('label,input,p')[i]),errors}),100));
}else{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 window.renderForms=props=>root.render(<React.StrictMode><FormsScene {...props}/></React.StrictMode>);window.renderForms({});
 window.unmountForms=()=>root.unmount();
}

import React from 'react';import {createRoot,hydrateRoot} from 'react-dom/client';import {AlertScene,HydrationScene} from './alert-scene.jsx';
const existing=document.getElementById('hydration');
if(existing){window.savedHydrated=existing.querySelector('#hydrated');hydrateRoot(existing,<React.StrictMode><HydrationScene/></React.StrictMode>,{onRecoverableError:e=>{throw e}});window.hydrationReady=true;}
else{const host=document.createElement('div');document.body.append(host);const root=createRoot(host);window.renderAlert=(props={})=>root.render(<React.StrictMode><AlertScene {...props}/></React.StrictMode>);window.unmountAlert=()=>root.unmount();window.renderAlert();}

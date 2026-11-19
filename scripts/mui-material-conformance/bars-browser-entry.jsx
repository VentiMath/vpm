import React from 'react';import {createRoot,hydrateRoot} from 'react-dom/client';import {BarsScene,HydrationScene} from './bars-scene.jsx';
const existing=document.getElementById('hydration');
if(existing){window.savedHydrated=existing.querySelector('#hydrated');hydrateRoot(existing,<React.StrictMode><HydrationScene/></React.StrictMode>,{onRecoverableError:e=>{throw e}});window.hydrationReady=true;}
else{const host=document.createElement('div');document.body.append(host);const root=createRoot(host);window.renderBars=(props={})=>root.render(<React.StrictMode><BarsScene {...props}/></React.StrictMode>);window.unmountBars=()=>root.unmount();window.renderBars();}

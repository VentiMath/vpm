import React from 'react';import {createRoot,hydrateRoot} from 'react-dom/client';import {BadgeScene,HydrationScene} from './badge-scene.jsx';
const existing=document.getElementById('hydration');
if(existing){window.savedHydrated=existing.querySelector('#hydrated');hydrateRoot(existing,<React.StrictMode><HydrationScene/></React.StrictMode>,{onRecoverableError:e=>{throw e}});window.hydrationReady=true;}
else{const host=document.createElement('div');document.body.append(host);const root=createRoot(host);window.renderBadge=(props={})=>root.render(<React.StrictMode><BadgeScene {...props}/></React.StrictMode>);window.unmountBadge=()=>root.unmount();window.renderBadge();}

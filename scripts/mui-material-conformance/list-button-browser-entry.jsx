import React from 'react';import {createRoot,hydrateRoot} from 'react-dom/client';import {ListButtonScene,HydrationScene} from './list-button-scene.jsx';
const existing=document.getElementById('hydration');
if(existing){window.savedHydrated=existing.querySelector('#hydrated');hydrateRoot(existing,<React.StrictMode><HydrationScene/></React.StrictMode>,{onRecoverableError:e=>{throw e}});window.hydrationReady=true;}
else{const host=document.createElement('div');document.body.append(host);const root=createRoot(host);window.renderListButton=(props={})=>root.render(<React.StrictMode><ListButtonScene {...props}/></React.StrictMode>);window.unmountListButton=()=>root.unmount();window.renderListButton();}

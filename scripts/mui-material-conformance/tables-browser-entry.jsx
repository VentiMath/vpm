import React from 'react';import {createRoot,hydrateRoot} from 'react-dom/client';import {TableScene,HydrationScene} from './tables-scene.jsx';
const existing=document.getElementById('hydration');
if(existing){window.hydratedTable=existing.querySelector('table');hydrateRoot(existing,<React.StrictMode><HydrationScene/></React.StrictMode>,{onRecoverableError:e=>{throw e}});window.hydrationReady=true;}
else{const host=document.createElement('div');document.body.append(host);const root=createRoot(host);window.renderTables=(props={})=>root.render(<React.StrictMode><TableScene {...props}/></React.StrictMode>);window.unmountTables=()=>root.unmount();window.renderTables();}

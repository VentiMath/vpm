import React from 'react';
import {createRoot,hydrateRoot} from 'react-dom/client';
import {VariantScene,HydrationScene} from './select-scene.jsx';
const existing=document.querySelector('#hydration');
if(existing){window.savedHydrated=existing.querySelector('[role=combobox]');hydrateRoot(existing,<React.StrictMode><HydrationScene/></React.StrictMode>,{onRecoverableError:e=>{throw e}});window.hydrationReady=true;}
else{const host=document.createElement('div');document.body.append(host);const root=createRoot(host);window.renderVariants=(props={})=>root.render(<React.StrictMode><VariantScene {...props}/></React.StrictMode>);window.unmountVariants=()=>root.unmount();window.renderVariants();}

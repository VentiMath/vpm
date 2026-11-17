import React from 'react';import {createRoot,hydrateRoot} from 'react-dom/client';import {VariantScene,HydrationScene} from './drawer-scene.jsx';
const existing=document.getElementById('hydration');
if(existing){window.hydratedPaper=existing.querySelector('.MuiDrawer-paper');hydrateRoot(existing,<React.StrictMode><HydrationScene/></React.StrictMode>,{onRecoverableError:e=>{throw e}});window.hydrationReady=true;}
else{const host=document.createElement('div');document.body.append(host);const root=createRoot(host);window.renderDrawer=(props={})=>root.render(<React.StrictMode><VariantScene key={props.reset||0} {...props}/></React.StrictMode>);window.unmountDrawer=()=>root.unmount();window.renderDrawer();}

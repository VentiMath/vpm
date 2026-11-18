import React from 'react';import {createRoot,hydrateRoot} from 'react-dom/client';import {NavigationScene,HydrationScene} from './navigation-scene.jsx';
const existing=document.getElementById('hydration');
if(existing){window.savedPages=existing.querySelector('#pages');hydrateRoot(existing,<React.StrictMode><HydrationScene/></React.StrictMode>,{onRecoverableError:e=>{throw e}});window.hydrationReady=true;}
else{const host=document.createElement('div');document.body.append(host);const root=createRoot(host);window.renderNavigation=(props={})=>root.render(<React.StrictMode><NavigationScene {...props}/></React.StrictMode>);window.unmountNavigation=()=>root.unmount();window.renderNavigation();}

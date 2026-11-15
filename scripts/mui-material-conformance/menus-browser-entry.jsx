import React from 'react';
import {createRoot,hydrateRoot} from 'react-dom/client';
import {VariantScene,HydrationScene} from './menus-scene.jsx';
const existing=document.querySelector('#hydration');
if(existing){window.savedHydrated=existing.querySelector('#hydrate-item');hydrateRoot(existing,<React.StrictMode><HydrationScene/></React.StrictMode>,{onRecoverableError:e=>{throw e}});window.hydrationReady=true;}
else{const host=document.createElement('div');document.body.append(host);const root=createRoot(host);window.renderVariants=(props={})=>root.render(<React.StrictMode><VariantScene {...props}/></React.StrictMode>);window.unmountVariants=()=>root.unmount();window.renderVariants();}
import {IframeScene} from './menus-scene.jsx';
window.mountFrame=()=>{const frame=document.createElement('iframe');frame.id='menu-frame';document.body.append(frame);const doc=frame.contentDocument;doc.open();doc.write('<!doctype html><html><head></head><body></body></html>');doc.close();const host=doc.createElement('div');doc.body.append(host);const root=createRoot(host);root.render(<React.StrictMode><IframeScene doc={doc}/></React.StrictMode>);window.removeFrame=()=>{root.unmount();frame.remove();};};

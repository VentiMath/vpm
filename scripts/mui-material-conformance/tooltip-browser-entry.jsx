import React from 'react';
import {createRoot,hydrateRoot} from 'react-dom/client';
import {VariantScene,HydrationScene} from './tooltip-scene.jsx';
const existing=document.querySelector('#hydration');
if(existing){window.savedHydrated=existing.querySelector('#hydrated');hydrateRoot(existing,<React.StrictMode><HydrationScene/></React.StrictMode>,{onRecoverableError:e=>{throw e}});window.hydrationReady=true;}
else{const host=document.createElement('div');document.body.append(host);const root=createRoot(host);window.renderVariants=(props={})=>root.render(<React.StrictMode><VariantScene {...props}/></React.StrictMode>);window.unmountVariants=()=>root.unmount();window.renderVariants();}

import {Tooltip} from '@buttons';
window.mountFrame=()=>{const frame=document.createElement('iframe');frame.id='frame';document.body.append(frame);const root=createRoot(frame.contentDocument.body);root.render(<Tooltip title="Frame hint" open><button>Frame</button></Tooltip>);window.unmountFrame=()=>{root.unmount();frame.remove()}};

import React from 'react';
import {createRoot,hydrateRoot} from 'react-dom/client';
import {TextScene} from './text-scene.jsx';
import {Typography,Link,SvgIcon} from '@buttons';
const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
window.unmountTextCase=()=>root.unmount();
window.renderTextCase=props=>root.render(<TextScene {...props}/>);window.renderTextCase({});
window.textHydrate=async html=>{
 const el=document.createElement('div');el.innerHTML=html;document.body.append(el);
 const before=[...el.querySelectorAll('h2,a,svg')],errors=[];
 const r=hydrateRoot(el,<><Typography variant="h2">Contest</Typography><Link href="#local">Details</Link><SvgIcon titleAccess="Contest icon"><path d="M1 1h20v20H1z"/></SvgIcon></>,{onRecoverableError:e=>errors.push(e.message)});
 await new Promise(r=>setTimeout(r,50));const same=before.every((node,i)=>node===el.querySelectorAll('h2,a,svg')[i]);r.unmount();el.remove();return {same,errors};
};

import {checkApplicationRoots} from './application-scene.jsx';
window.checkApplicationRoots=checkApplicationRoots;

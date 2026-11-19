import React from 'react';import {createRoot,hydrateRoot} from 'react-dom/client';import {AccordionPartsScene,HydrationScene} from './accordion-parts-scene.jsx';
const existing=document.getElementById('hydration');
if(existing){window.savedHydrated=existing.querySelector('#hydrated');hydrateRoot(existing,<React.StrictMode><HydrationScene/></React.StrictMode>,{onRecoverableError:e=>{throw e}});window.hydrationReady=true;}
else{const host=document.createElement('div');document.body.append(host);const root=createRoot(host);window.renderAccordion=(props={})=>root.render(<React.StrictMode><AccordionPartsScene {...props}/></React.StrictMode>);window.unmountAccordion=()=>root.unmount();window.renderAccordion();}

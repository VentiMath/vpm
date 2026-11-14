import React from 'react';
import {createRoot,hydrateRoot} from 'react-dom/client';
import {SurfaceScene,HydrationScene} from './surfaces-scene.jsx';
const delivered=document.querySelector('#hydration');
if(delivered){
 const before=[...delivered.querySelectorAll('article,div,span')],errors=[];
 hydrateRoot(delivered,<HydrationScene/>,{onRecoverableError:e=>errors.push(e.message)});
 window.hydrationReady=new Promise(resolve=>setTimeout(()=>resolve({same:before.every((n,i)=>n===delivered.querySelectorAll('article,div,span')[i]),errors}),100));
}else{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 window.renderSurfaces=props=>root.render(<SurfaceScene {...props}/>);window.renderSurfaces({});
 window.unmountSurfaces=()=>root.unmount();
}

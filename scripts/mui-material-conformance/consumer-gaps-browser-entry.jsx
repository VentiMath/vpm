import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import {Scene} from './consumer-gaps-scene.jsx';
const root=createRoot(document.body.appendChild(document.createElement('main')));window.events=[];window.draw=(props)=>flushSync(()=>root.render(<Scene {...props}/>));window.draw({});

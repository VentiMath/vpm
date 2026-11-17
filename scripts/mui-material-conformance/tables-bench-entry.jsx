import React from 'react';import {renderToString} from 'react-dom/server';import {TableScene} from './tables-scene.jsx';
export function prepare(kind){const props=kind==='scores'?{size:'small',sticky:true}:kind==='results'?{size:'medium',sticky:false}:{size:'small',variables:true,custom:true};const el=React.createElement(TableScene,props);return()=>renderToString(el);}

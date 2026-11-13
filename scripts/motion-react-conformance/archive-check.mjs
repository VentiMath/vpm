import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToString} from 'react-dom/server';
import * as root from 'vmotion';
import * as react from 'vmotion/react';
const require=createRequire(import.meta.url),cjs=require('vmotion/react');
for(const key of ['motion','useAnimation','MotionConfig','useReducedMotion']){assert.equal(root[key],react[key]);assert.equal(react[key],cjs[key]);}
assert.equal(renderToString(React.createElement(react.motion.div,{initial:{opacity:0,x:-20},animate:{opacity:1,x:0}},'Contest')),'<div style="opacity:0;transform:translateX(-20px)">Contest</div>');
for(const name of ['framer-motion','motion','motion-dom','@mui/material'])assert.throws(()=>require.resolve(name));
console.log('Packed vmotion root/react CJS/ESM identity and direct SSR pass; no upstream runtime installed');

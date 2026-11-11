"use strict";
const path=require('node:path'),assert=require('node:assert/strict');
require('../../../scripts/check-bun.cjs');require('../../../scripts/goober-conformance/check-controls.cjs').check();
const {loadCaller}=require('../../../scripts/goober-conformance/caller.cjs');
const root=path.resolve(__dirname,'..');
const cases=[
 {name:'repeated flat object styles',make(file){const api=require(file),obj={color:'#fff',backgroundColor:'#43a047',padding:'6px 16px',borderRadius:'4px'};return()=>api.css(obj);},validate:x=>assert.equal(typeof x,'string')},
 {name:'repeated nested responsive styles',make(file){const api=require(file),obj={display:'flex','&:hover':{opacity:.8},'@media (min-width:600px)':{minWidth:'288px',flexGrow:1}};return()=>api.css(obj);},validate:x=>assert.equal(typeof x,'string')},
 {name:'changing style and SSR extraction',make(file){const api=require(file);let i=0;api.extractCss();return()=>{api.css({opacity:(i++%1000)/1000,padding:'2px'});return api.extractCss();};},validate:x=>assert.match(x,/opacity:[\d.]+;padding:2px;/)},
 {name:'20 Notistack definitions and SSR extraction',make(file){const api=require(file),inputs=loadCaller(api).calls.map(x=>x.styles);api.extractCss();return()=>{for(const args of inputs)api.css(...args);return api.extractCss();};},validate:x=>{assert.ok(x.includes('background-color:#43a047;'));assert.ok(x.includes('@media (min-width:600px)'));}},
];
require('../../../scripts/bench-process.cjs').run({root,upstream:require.resolve('../../../scripts/goober-conformance/node_modules/goober'),vpm:path.join(root,'index.cjs'),cases,files:['index.cjs','index.mjs','package.json','PROVENANCE.json','bench/run.cjs','../../scripts/goober-conformance/caller.cjs','../../scripts/goober-conformance/check-controls.cjs','../../scripts/goober-conformance/provenance.json','../../scripts/goober-conformance/node_modules/goober','../../scripts/goober-conformance/node_modules/notistack']}).catch(e=>{console.error(e);process.exitCode=1;});

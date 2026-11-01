'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {JSDOM}=require('../../../scripts/tabbable-conformance/node_modules/jsdom');
const root=path.resolve(__dirname,'..'),dom=new JSDOM('<body></body>');
// Model a uniformly visible form. Real computed-style behavior is covered by
// the Chrome suite; jsdom 26's style engine stalls under repeated Bun workloads
// for both original and VPM. Apply this same static style provider to both.
const actualStyle=dom.window.getComputedStyle.bind(dom.window),visibleStyle=Object.freeze({visibility:'visible'});
dom.window.getComputedStyle=()=>visibleStyle;
Object.assign(globalThis,{window:dom.window,document:dom.window.document,Element:dom.window.Element,HTMLElement:dom.window.HTMLElement,getComputedStyle:dom.window.getComputedStyle});
function setup(directory,html){const api=require(directory),host=document.createElement('div');host.innerHTML=html;document.body.append(host);assert.equal(actualStyle(host).visibility,visibleStyle.visibility);return {api,host,options:{displayCheck:'none'}};}
const cases=[
 {name:'model / four-button focus list',make:directory=>{const {api,host,options}=setup(directory,'<button>A</button><a href="/">B</a><input><button tabindex="-1">C</button>');return()=>api.tabbable(host,options);},validate:value=>assert.equal(value.length,3)},
 {name:'model / 120 radios, 30 groups',make:directory=>{const {api,host,options}=setup(directory,Array.from({length:120},(_,i)=>`<input type="radio" name="g${i>>2}" ${i%4===0?'checked':''}>`).join(''));return()=>api.tabbable(host,options);},validate:value=>assert.equal(value.length,30)},
 {name:'model / shadow focus list',make:directory=>{const {api,host,options}=setup(directory,'<div></div>');host.firstChild.attachShadow({mode:'open'}).innerHTML='<button>A</button><button>B</button>';options.getShadowRoot=true;return()=>api.tabbable(host,options);},validate:value=>assert.equal(value.length,2)},
 {name:'model / isTabbable button',make:directory=>{const {api,host,options}=setup(directory,'<button>A</button>'),node=host.firstChild;return()=>api.isTabbable(node,options);},validate:value=>assert.equal(value,true)},
 {name:'DOM / explicit tab index',make:directory=>{const {api,host}=setup(directory,'<button tabindex="2">A</button>'),node=host.firstChild;return()=>api.getTabIndex(node);},validate:value=>assert.equal(value,2)},
];
require('../../../scripts/bench-process.cjs').run({root,upstream:path.resolve(root,'../../scripts/tabbable-conformance/node_modules/tabbable'),vpm:root,cases,validationOnly:process.argv.includes('--validate'),files:['package.json','index.cjs','runtime.mjs','bench/compare.cjs','../../scripts/tabbable-conformance/package-lock.json','../../scripts/tabbable-conformance/node_modules/tabbable'],cleanup:async()=>dom.window.close()}).catch(error=>{console.error(error);process.exitCode=1;});

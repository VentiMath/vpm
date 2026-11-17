'use strict';process.env.NODE_ENV='production';
const assert=require('node:assert/strict'),{peer}=require('./paths.cjs'),R=peer('react'),h=R.createElement,r=peer('react-dom/server').renderToStaticMarkup,own=require(require('./prepare.cjs'));
const render=(M,p)=>r(h(M.Slide,p,h('section',{id:'child',style:{color:'blue'},'aria-label':'Settings'},h('input',{defaultValue:'Draft'}))));
let checks=0;
for(const name of ['@mui/material','mui-material-app']){const up=peer(name);for(const open of [false,true])for(const appear of [false,true])for(const mountOnEnter of [false,true])for(const unmountOnExit of [false,true])for(const direction of ['left','right','up','down'])for(const style of [undefined,{color:'red',transitionDuration:'12ms'}]){const p={in:open,appear,mountOnEnter,unmountOnExit,direction,style,id:'outer','data-transition':'slide',timeout:20};assert.equal(render(own,p),render(up,p),JSON.stringify({name,p}));checks++}}
console.log(checks+' Slide current/app SSR, mounting, child props/style priority and wrapper-free comparisons pass');

"use strict";
const assert = require('node:assert/strict');
const {loadCaller} = require('./caller.cjs');
const vpm = require(process.env.VGOOBER_ENTRY || '../../packages/vgoober');
let comparisons = 0;
const normalize = (text,name) => text.replaceAll('.'+name, '.CLASS');
for(const control of ['goober','goober-app']) {
  const upstream = require('./node_modules/'+control);
  upstream.extractCss(); vpm.extractCss();
  const inputs = loadCaller(upstream).calls.map(x=>x.styles);
  assert.equal(inputs.length,20);
  upstream.extractCss();
  inputs.push([{color:'red','&:hover,&:focus':{color:'blue'},'> span':{opacity:.5}}],
    [{WebkitUserSelect:'none','--Tone':'red',margin:0}],
    [{color:'red','@supports (display:grid)':{'@media (min-width:1px)':{display:'grid'}}}],
    [[{color:'red'},{padding:0}]]);
  for(let i=0;i<96;i++) inputs.push([{opacity:i/100,margin:i+'px','&:hover':{opacity:1},'@media (min-width:600px)':{padding:i+'px'}}]);
  for(const args of inputs) {
    const a=vpm.css(...args),b=upstream.css(...args);
    assert.equal(normalize(vpm.extractCss(),a),normalize(upstream.extractCss(),b),JSON.stringify(args));comparisons++;
  }
  const {caller,calls} = loadCaller(vpm);
  const React=require('./node_modules/react'), {renderToStaticMarkup}=require('./node_modules/react-dom/server');
  const html=renderToStaticMarkup(React.createElement(caller.SnackbarProvider,{maxSnack:3},React.createElement('button',null,'Notify')));
  assert.ok(html.includes('Notify'));assert.equal(calls.length,20);
  vpm.extractCss();
}
console.log(`${comparisons} CSS comparisons and unchanged Notistack SSR imports pass against current 2.1.19 and app 2.1.18.`);

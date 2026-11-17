'use strict';process.env.NODE_ENV='production';
const assert=require('node:assert/strict'),{peer}=require('./paths.cjs'),R=peer('react'),render=peer('react-dom/server').renderToStaticMarkup,own=require(require('./prepare.cjs'));
function norm(html){return html.replace(/ data-mui-internal-clone-element="true"/g,'').replace(/<style[\s\S]*?<\/style>/g,'').replace(/<([\w-]+)([^>]*)>/g,(_,tag,attrs)=>'<'+tag+[...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>' '+x[1]+'="'+x[2]+'"').sort().join('')+'>')}
let count=0;
for(const name of ['@mui/material','mui-material-app']){const up=peer(name);assert.deepEqual(own.tooltipClasses,up.tooltipClasses);
 for(const title of ['',null,false,undefined,0,42,'Copied!',R.createElement('b',null,'Staff')])for(const describeChild of [false,true])for(const open of [undefined,false,true])for(const disableHoverListener of [false,true])for(const attrs of [{},{'aria-label':'Explicit','aria-describedby':'details',className:'child'}]){
  const p={id:'tip',title,describeChild,open,disableHoverListener,className:'caller'};
  const output=lib=>norm(render(R.createElement(lib.Tooltip,p,R.createElement('button',attrs,'Reference'))));
  assert.equal(output(own),output(up),JSON.stringify({name,title,describeChild,open,disableHoverListener,attrs}));count++;
 }}
console.log(count+' Tooltip current/app naming, description, empty-title and SSR comparisons pass');

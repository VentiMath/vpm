'use strict';
process.env.NODE_ENV='production';
const assert=require('node:assert/strict'),{peer}=require('./paths.cjs'),R=peer('react'),h=R.createElement,r=peer('react-dom/server').renderToStaticMarkup,own=require(require('./prepare.cjs'));
function norm(html){return html.replace(/<style[\s\S]*?<\/style>/g,'').replace(/ inert=""/g,'').replace(/ class="([^"]*)"/g,(_,s)=>' class="'+s.split(' ').filter(c=>!c.startsWith('css-')).sort().join(' ')+'"').replace(/<([\w-]+)([^>]*)>/g,(_,tag,attrs)=>'<'+tag+[...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>' '+x[1]+'="'+x[2]+'"').sort().join('')+'>');}
let checks=0;
for(const name of ['@mui/material','mui-material-app']){
 const upstream=peer(name);
 for(const maxWidth of [undefined,false,'xs','sm','md','lg','xl'])for(const fixed of [false,true])for(const disableGutters of [false,true])for(const component of ['div','section']){
  const props={maxWidth,fixed,disableGutters,component,classes:{root:'page',fixed:'fixed-page'},sx:{py:4},children:'Results'};
  assert.equal(norm(r(h(own.Container,props))),norm(r(h(upstream.Container,props))),name+' '+JSON.stringify(props));checks++;
 }
 assert.deepEqual(own.containerClasses,upstream.containerClasses);
}
console.log(checks+' Container SSR comparisons pass current/app controls');

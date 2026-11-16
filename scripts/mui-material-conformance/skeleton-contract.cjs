'use strict';
process.env.NODE_ENV='production';
const assert=require('node:assert/strict'),{peer}=require('./paths.cjs'),R=peer('react'),h=R.createElement,r=peer('react-dom/server').renderToStaticMarkup,own=require(require('./prepare.cjs'));
function norm(html){return html.replace(/<style[\s\S]*?<\/style>/g,'').replace(/ inert=""/g,'').replace(/ class="([^"]*)"/g,(_,s)=>' class="'+s.split(' ').filter(c=>!c.startsWith('css-')).sort().join(' ')+'"').replace(/<([\w-]+)([^>]*)>/g,(_,tag,attrs)=>'<'+tag+[...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>' '+x[1]+'="'+x[2]+'"').sort().join('')+'>');}
let checks=0;
for(const name of ['@mui/material','mui-material-app']){
 const upstream=peer(name);
 for(const variant of ['text','rectangular','rounded','circular'])for(const animation of ['pulse','wave',false])for(const dimensions of [{},{width:80,height:40},{width:'70%',height:'2rem'},{width:0,height:0}])for(const children of [undefined,h('span',null,'Measure')])for(const component of ['span','div']){
  const props={variant,animation,...dimensions,children,component};assert.equal(norm(r(h(own.Skeleton,props))),norm(r(h(upstream.Skeleton,props))),name+' '+JSON.stringify(props));checks++;
 }
 assert.deepEqual(own.skeletonClasses,upstream.skeletonClasses);
}
console.log(checks+' Skeleton SSR comparisons pass current/app controls; measurement inert is the intentional addition');

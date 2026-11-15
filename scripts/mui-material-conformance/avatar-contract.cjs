'use strict';
process.env.NODE_ENV='production';
const assert=require('node:assert/strict'),{peer}=require('./paths.cjs'),R=peer('react'),h=R.createElement,r=peer('react-dom/server').renderToStaticMarkup,own=require(require('./prepare.cjs'));
function norm(html){return html.replace(/<style[\s\S]*?<\/style>/g,'').replace(/ class="([^"]*)"/g,(_,s)=>' class="'+s.split(' ').filter(c=>!c.startsWith('css-')).sort().join(' ')+'"').replace(/<([\w-]+)([^>]*)>/g,(_,tag,attrs)=>'<'+tag+[...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>' '+x[1]+'="'+x[2]+'"').sort().join('')+'>');}
let checks=0;
for(const name of ['@mui/material','mui-material-app']){
 const upstream=peer(name);
 for(const variant of ['circular','rounded','square'])for(const children of [undefined,'A',0,h('b',null,'A')])for(const image of [{},{src:'/person.png',alt:'Student'},{srcSet:'/person.png 1x, /large.png 2x',sizes:'40px',alt:'Student'}])for(const component of ['div','span']){
  const props={variant,children,...image,component};assert.equal(norm(r(h(own.Avatar,props))),norm(r(h(upstream.Avatar,props))),name+' '+JSON.stringify(props));checks++;
 }
 assert.deepEqual(own.avatarClasses,upstream.avatarClasses);
}
console.log(checks+' Avatar SSR comparisons pass current/app controls');

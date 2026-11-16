'use strict';
process.env.NODE_ENV='production';
const assert=require('node:assert/strict'),{peer}=require('./paths.cjs'),R=peer('react'),h=R.createElement,r=peer('react-dom/server').renderToStaticMarkup,own=require(require('./prepare.cjs'));
function norm(html,app){return html.replace(/<style[\s\S]*?<\/style>/g,'').replace(/ class="([^"]*)"/g,(_,s)=>' class="'+s.split(' ').filter(c=>!c.startsWith('css-')&&!/^MuiCircularProgress-circle(?:Determinate|Indeterminate)$/.test(c)).sort().join(' ')+'"').replace(app?/ aria-valuemin="0"| aria-valuemax="100"/g:/$^/g,'').replace(/<([\w-]+)([^>]*)>/g,(_,tag,attrs)=>'<'+tag+[...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>' '+x[1]+'="'+x[2]+'"').sort().join('')+'>');}
let checks=0;
for(const name of ['@mui/material','mui-material-app']){
 const upstream=peer(name),app=name==='mui-material-app';
 for(const variant of ['determinate','indeterminate'])for(const size of [20,24,40,'2rem'])for(const value of [0,25,100])for(const color of ['primary','inherit','error']){
  const props={variant,size,value,color,'aria-label':'Loading results'};assert.equal(norm(r(h(own.CircularProgress,props)),app),norm(r(h(upstream.CircularProgress,props)),app),name+' '+JSON.stringify(props));checks++;
 }
 if(!app){assert.deepEqual(own.circularProgressClasses,upstream.circularProgressClasses);for(const value of [10,15,30]){const props={min:10,max:30,value,variant:'determinate',enableTrackSlot:true,thickness:5};assert.equal(norm(r(h(own.CircularProgress,props))),norm(r(h(upstream.CircularProgress,props))));checks++}}
}
console.log(checks+' CircularProgress SSR comparisons pass current/app controls');

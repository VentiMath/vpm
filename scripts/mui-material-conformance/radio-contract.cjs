"use strict";
process.env.NODE_ENV='production';
const assert=require('node:assert/strict'),{peer}=require('./paths.cjs'),R=peer('react'),h=R.createElement,r=peer('react-dom/server').renderToStaticMarkup,own=require(require('./prepare.cjs'));
function norm(html,app=false){return html.replace(/<style[\s\S]*?<\/style>/g,'').replace(/<span class="MuiTouchRipple-root"[^>]*><\/span>/g,'').replace(app?/ (?:tabindex="-1"|aria-disabled="true")/g:/$^/g,'').replace(/ class="([^"]*)"/g,(_,s)=>' class="'+[...new Set(s.split(' ').filter(c=>!c.startsWith('css-')))].sort().join(' ')+'"').replace(/<([\w-]+)([^>]*)>/g,(_,tag,attrs)=>'<'+tag+[...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>' '+x[1]+'="'+x[2]+'"').sort().join('')+'>');}

let checks=0;
for(const version of ['@mui/material','mui-material-app']){
 const a=peer(version),app=version==='mui-material-app';
 for(const size of ['small','medium','large'])for(const color of ['primary','secondary','default'])for(const checked of [undefined,false,true])for(const disabled of [false,true])for(const edge of [false,'start','end']){
  const p={id:'radio',name:'flight',value:'early',size,color,checked,disabled,edge,slotProps:{input:{'aria-label':'Early flight'}}};assert.equal(norm(r(h(own.Radio,p))),norm(r(h(a.Radio,p)),app),version+' Radio '+JSON.stringify(p));checks++;
 }
 for(const value of [undefined,'b',2,false])for(const row of [false,true])for(const error of [false,true])for(const disabled of [false,true]){
  const make=api=>h(api.FormControl,{error,disabled},h(api.RadioGroup,{name:'choice',defaultValue:value,row},['a','b',2,false].map(v=>h(api.FormControlLabel,{key:String(v),value:v,label:String(v),control:h(api.Radio,{size:'small'})}))));
  assert.equal(norm(r(make(own))),norm(r(make(a)),app),version+' group '+JSON.stringify({value,row,error,disabled}));checks++;
 }
 for(const key of ['radioClasses','radioGroupClasses','formGroupClasses'])assert.deepEqual(own[key],a[key]);
}
console.log(checks+' Radio/RadioGroup SSR comparisons pass current/app controls');

'use strict';
process.env.NODE_ENV='production';
const assert=require('node:assert/strict'),{peer}=require('./paths.cjs'),R=peer('react'),h=R.createElement,r=peer('react-dom/server').renderToStaticMarkup,own=require(require('./prepare.cjs'));
// App7 puts disabled ARIA/tabIndex on an inert wrapper and has no native
// switch role. VPM follows current9 for those three explicit differences.
function norm(html,app=false){return html.replace(app?/ (?:role="switch"|tabindex="-1"|aria-disabled="true")/g:/$^/g,'').replace(/<style[\s\S]*?<\/style>/g,'').replace(/<span class="MuiTouchRipple-root"[^>]*><\/span>/g,'').replace(/ class="([^"]*)"/g,(_,s)=>' class="'+[...new Set(s.split(' ').filter(c=>!c.startsWith('css-')))].sort().join(' ')+'"').replace(/<([\w-]+)([^>]*)>/g,(_,tag,attrs)=>'<'+tag+[...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>' '+x[1]+'="'+x[2]+'"').sort().join('')+'>');}
let checks=0;
for(const version of ['@mui/material','mui-material-app']){
 const a=peer(version);
 for(const size of ['small','medium'])for(const color of ['primary','secondary','default','error'])for(const checked of [undefined,false,true])for(const disabled of [false,true])for(const edge of [false,'start','end']){
  const p={id:'switch',name:'email',value:'yes',size,color,checked,disabled,edge,slotProps:{input:{'aria-label':'Notify me'}}};assert.equal(norm(r(h(own.Switch,p)),version==='mui-material-app'),norm(r(h(a.Switch,p)),version==='mui-material-app'),version+' '+JSON.stringify(p));checks++;
 }
 assert.deepEqual(own.switchClasses,a.switchClasses);
}
console.log(checks+' Switch SSR comparisons pass current/app controls');

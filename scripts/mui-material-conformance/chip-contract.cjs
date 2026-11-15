'use strict';
process.env.NODE_ENV='production';
const assert=require('node:assert/strict'),{peer}=require('./paths.cjs'),R=peer('react'),h=R.createElement,r=peer('react-dom/server').renderToStaticMarkup,own=require(require('./prepare.cjs'));
function norm(html,app=false){return html.replace(/<style[\s\S]*?<\/style>/g,'').replace(/<span class="MuiTouchRipple-root"[^>]*><\/span>/g,'').replace(/ class="([^"]*)"/g,(_,s)=>' class="'+[...new Set(s.split(' ').filter(c=>!c.startsWith('css-')&&(!app||!/^MuiChip-(?:filled[A-Z]|outlined[A-Z]|clickableColor|deletableColor|avatar[A-Z]|icon[A-Z]|label[A-Z]|deleteIcon[A-Z])/.test(c))))].sort().join(' ')+'"').replace(/<([\w-]+)([^>]*)>/g,(_,tag,attrs)=>'<'+tag+[...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>' '+x[1]+'="'+x[2]+'"').sort().join('')+'>');}
let checks=0;
for(const version of ['@mui/material','mui-material-app']){
 const a=peer(version);
 for(const size of ['small','medium'])for(const color of ['default','primary','secondary','error','info','success','warning'])for(const variant of ['filled','outlined'])for(const behavior of ['plain','click','delete','both'])for(const visual of ['label','icon','avatar']){
 const p={id:'chip',label:'Contest',size,color,variant,...(behavior==='click'||behavior==='both'?{onClick(){}}:{}),...(behavior==='delete'||behavior==='both'?{onDelete(){}}:{}),...(visual==='icon'?{icon:h('svg',{'aria-hidden':true})}:visual==='avatar'?{avatar:h('b',null,'A')}:{})};
 assert.equal(norm(r(h(own.Chip,p)),version==='mui-material-app'),norm(r(h(a.Chip,p)),version==='mui-material-app'),version+' '+JSON.stringify(p));checks++;
 }
 if(version==='@mui/material')assert.deepEqual(own.chipClasses,a.chipClasses);
}
console.log(checks+' Chip SSR comparisons pass current/app controls');

'use strict';
const assert=require('node:assert/strict');
const {peer}=require('./paths.cjs'),R=peer('react'),h=R.createElement,render=peer('react-dom/server').renderToStaticMarkup,own=require(require('./prepare.cjs'));
function normalize(html){return html.replace(/<style[\s\S]*?<\/style>/g,'').replace(/ class="([^"]*)"/g,(_,s)=>' class="'+[...new Set(s.split(' ').filter(c=>!c.startsWith('css-')))].sort().join(' ')+'"').replace(/<([\w-]+)([^>]*)>/g,(_,tag,attrs)=>'<'+tag+[...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>' '+x[1]+'="'+x[2]+'"').sort().join('')+'>');}
let checks=0;
for(const pkg of ['@mui/material','mui-material-app']){
 const control=peer(pkg);
 for(const parent of [false,true])for(const variant of [undefined,'standard','outlined','filled'])for(const size of [undefined,'small','medium'])for(const shrink of [undefined,false,true])for(const disabled of [false,true])for(const required of [false,true]){
 const props={variant,size,shrink,disabled,required,htmlFor:'field',error:true,classes:{root:'custom',asterisk:'star'},children:'Contest'};
 const draw=M=>normalize(render(parent?h(M.FormControl,{size:'small',variant:'filled',focused:true,color:'secondary'},h(M.InputLabel,props)):h(M.InputLabel,props)));
 assert.equal(draw(own),draw(control),pkg+' label '+JSON.stringify({parent,...props}));checks++;
 }
 for(const parent of [false,true])for(const position of ['start','end'])for(const variant of [undefined,'standard','outlined','filled'])for(const disableTypography of [false,true])for(const disablePointerEvents of [false,true])for(const child of ['$',h('button',null,'Show'),0]){
 const props={position,variant,disableTypography,disablePointerEvents,component:'aside',classes:{root:'custom'},children:child};
 const draw=M=>normalize(render(parent?h(M.FormControl,{size:'small',variant:'filled',hiddenLabel:true},h(M.InputAdornment,props)):h(M.InputAdornment,props)));
 assert.equal(draw(own),draw(control),pkg+' adornment '+JSON.stringify({parent,...props}));checks++;
 }
}
console.log(checks+' InputLabel/InputAdornment visible SSR, inherited state and native attribute comparisons pass');

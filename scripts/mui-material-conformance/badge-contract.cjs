'use strict';process.env.NODE_ENV='production';
const assert=require('node:assert/strict'),{peer}=require('./paths.cjs'),R=peer('react'),h=R.createElement,r=peer('react-dom/server').renderToStaticMarkup,M=require(require('./prepare.cjs'));
function norm(html,legacy=false){return html.replace(/<style[\s\S]*?<\/style>/g,'').replace(legacy?/ aria-hidden="true"| style="--Badge-[^"]*"/g:/$^/g,'').replace(/ class="([^"]*)"/g,(_,s)=>' class="'+s.split(' ').filter(c=>c&&!c.startsWith('css-')).sort().join(' ')+'"').replace(/<([\w-]+)([^>]*)>/g,(_,tag,attrs)=>'<'+tag+[...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>' '+x[1]+'="'+x[2]+'"').sort().join('')+'>');}
let checked=0;
for(const name of ['@mui/material','mui-material-app']){
 const U=peer(name),legacy=name==='mui-material-app';assert.deepEqual(M.badgeClasses,U.badgeClasses);
 for(const badgeContent of [undefined,null,false,0,'0',1,99,100,'100',h('b',null,'new')])for(const variant of ['standard','dot'])for(const showZero of [false,true])for(const invisible of [false,true])for(const overlap of ['rectangular','circular']){
  const p={badgeContent,variant,showZero,invisible,overlap,color:'error'};assert.equal(norm(r(h(M.Badge,p,'Icon')),legacy),norm(r(h(U.Badge,p,'Icon')),legacy),name+JSON.stringify(p));checked++;
 }
 for(const vertical of ['top','bottom'])for(const horizontal of ['left','right'])for(const color of ['default','primary','secondary','error','warning','info','success']){const p={badgeContent:120,max:9,color,anchorOrigin:{vertical,horizontal},classes:{badge:'count'},'aria-label':'Reading list'};assert.equal(norm(r(h(M.Badge,p,'R')),legacy),norm(r(h(U.Badge,p,'R')),legacy));checked++;}
 if(!legacy)for(const p of [{badgeContent:5,anchorOrigin:{horizontal:'left'}},{badgeContent:5,slots:{root:'section',badge:'i'}},{badgeContent:5,slotProps:{root:{className:'slot'},badge:s=>({'data-display':s.displayValue,style:{color:'red'},'aria-hidden':false})}}]){assert.equal(norm(r(h(M.Badge,p,'R'))),norm(r(h(U.Badge,p,'R'))));checked++;}
 const theme=peer(name+'/styles').createTheme({components:{MuiBadge:{defaultProps:{color:'warning',badgeContent:7,max:5},styleOverrides:{badge:{fontWeight:600}}}}});assert.equal(norm(r(h(M.ThemeProvider,{theme},h(M.Badge,null,'R'))),legacy),norm(r(h(U.ThemeProvider,{theme},h(U.Badge,null,'R'))),legacy));checked++;
}
console.log(checked+' current/app Badge count, visibility, dot, anchor, color, defaults and slot comparisons pass; current mark ARIA/CSS variables are explicit');

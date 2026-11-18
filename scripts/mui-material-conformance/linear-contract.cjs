'use strict';process.env.NODE_ENV='production';
const assert=require('node:assert/strict'),{peer}=require('./paths.cjs'),R=peer('react'),h=R.createElement,r=peer('react-dom/server').renderToStaticMarkup,M=require(require('./prepare.cjs'));
function norm(html,legacy=false){return html.replace(/<style[\s\S]*?<\/style>/g,'').replace(/ class="([^"]*)"/g,(_,s)=>' class="'+s.split(' ').filter(c=>!c.startsWith('css-')&&!/^MuiLinearProgress-(?:barColor|dashedColor|bar[12](?:Determinate|Indeterminate|Buffer))/.test(c)&&!(legacy&&s.includes('MuiLinearProgress-bar2')&&/^MuiLinearProgress-color/.test(c))).sort().join(' ')+'"').replace(/<([\w-]+)([^>]*)>/g,(_,tag,attrs)=>'<'+tag+[...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].filter(a=>!legacy||!html.includes('MuiLinearProgress-buffer')||!a[1].startsWith('aria-value')).map(x=>' '+x[1]+'="'+x[2]+'"').sort().join('')+'>');}
let checked=0;
for(const name of ['@mui/material','mui-material-app']){
 const U=peer(name),legacy=name==='mui-material-app';
 for(const variant of ['determinate','indeterminate','buffer','query'])for(const color of ['primary','secondary','error','warning','info','success','inherit'])for(const value of [0,25,50,100])for(const rtl of [false,true]){
  const theme=peer(name+'/styles').createTheme({direction:rtl?'rtl':'ltr'}),props={variant,color,value,valueBuffer:Math.max(value,75),'aria-label':'Loading resources'};
  const own=r(h(M.ThemeProvider,{theme},h(M.LinearProgress,props))),up=r(h(U.ThemeProvider,{theme},h(U.LinearProgress,props)));
  assert.equal(norm(own,legacy),norm(up,legacy),name+JSON.stringify({props,rtl}));checked++;
 }
 if(!legacy){assert.deepEqual(M.linearProgressClasses,U.linearProgressClasses);for(const [min,max]of [[-10,10],[10,50],[0,1]])for(const value of [min,(min+max)/2,max])for(const variant of ['determinate','buffer']){const p={min,max,value,valueBuffer:max,variant};assert.equal(norm(r(h(M.LinearProgress,p))),norm(r(h(U.LinearProgress,p))),JSON.stringify(p));checked++;}}
}
console.log(checked+' current/app LinearProgress markup, range, RTL and accessibility comparisons pass; current buffer ARIA is explicit');

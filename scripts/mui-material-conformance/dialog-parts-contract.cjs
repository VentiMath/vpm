'use strict';process.env.NODE_ENV='production';
const assert=require('node:assert/strict'),{peer}=require('./paths.cjs'),R=peer('react'),h=R.createElement,r=peer('react-dom/server').renderToStaticMarkup,own=require(require('./prepare.cjs'));
function norm(html){return html.replace(/<style[\s\S]*?<\/style>/g,'').replace(/ class="([^"]*)"/g,(_,s)=>' class="'+s.split(' ').filter(c=>!c.startsWith('css-')).sort().join(' ')+'"').replace(/<([\w-]+)([^>]*)>/g,(_,tag,attrs)=>'<'+tag+[...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>' '+x[1]+'="'+x[2]+'"').sort().join('')+'>');}
let checks=0;
for(const name of ['@mui/material','mui-material-app']){
 const up=peer(name);
 for(const variant of [undefined,'h4','body2','inherit'])for(const component of [undefined,'h1','h3','section'])for(const noWrap of [false,true])for(const id of [undefined,'heading','']){
  const p={variant,component,noWrap,id,color:'primary',align:'center',classes:{root:'title'},sx:{fontSize:'0.9rem'}};assert.equal(norm(r(h(own.DialogTitle,p,'Heading'))),norm(r(h(up.DialogTitle,p,'Heading'))),JSON.stringify({name,p}));checks++;
 }
 for(const component of ['DialogContent','DialogActions'])for(const flag of [false,true])for(const custom of [false,true]){
  const prop=component==='DialogContent'?'dividers':'disableSpacing',p={[prop]:flag,classes:{root:'root',dividers:'dividers',spacing:'spacing'},className:'caller','aria-label':'details'};
  const theme=up.createTheme({components:custom?{[component==='DialogContent'?'MuiDialogContent':'MuiDialogActions']:{defaultProps:{[prop]:!flag},styleOverrides:{root:{padding:0}}}}:{}});
  assert.equal(norm(r(h(own.ThemeProvider,{theme},h(own[component],p,'Body')))),norm(r(h(up.ThemeProvider,{theme},h(up[component],p,'Body')))));checks++;
 }
 for(const n of ['dialogTitleClasses','dialogContentClasses','dialogActionsClasses'])assert.deepEqual(own[n],up[n]);
}
const base=require('./dialog-parts-build.cjs');
for(const version of ['current','app'])for(const titleId of [undefined,'inherited'])for(const id of [undefined,'explicit','',null]){
 const p={titleId,id};assert.equal(norm(require(base+'/'+version+'-vpm/dialog-parts-ssr.cjs').context(p)),norm(require(base+'/'+version+'-upstream/dialog-parts-ssr.cjs').context(p)),JSON.stringify(p));checks++;
}
console.log(checks+' DialogTitle/Content/Actions current/app markup, title IDs, classes and theme-default comparisons pass');

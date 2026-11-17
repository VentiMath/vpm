'use strict';process.env.NODE_ENV='production';
const assert=require('node:assert/strict'),{peer}=require('./paths.cjs'),R=peer('react'),h=R.createElement,r=peer('react-dom/server').renderToStaticMarkup,own=require(require('./prepare.cjs'));
function norm(html){return html.replace(/<style[\s\S]*?<\/style>/g,'').replace(/<div[^>]*data-testid="sentinel(?:Start|End)"[^>]*><\/div>/g,'').replace(/ class="([^"]*)"/g,(_,s)=>' class="'+[...new Set(s.split(' ').filter(c=>!c.startsWith('css-')&&!c.startsWith('MuiDrawer-paperAnchor')))].sort().join(' ')+'"').replace(/<([\w-]+)([^>]*)>/g,(_,tag,attrs)=>'<'+tag+[...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>' '+x[1]+'="'+x[2]+'"').sort().join('')+'>');}
let checks=0;
for(const name of ['@mui/material','mui-material-app']){const up=peer(name);
 for(const variant of ['permanent','persistent','temporary'])for(const open of [false,true])for(const anchor of ['left','right','top','bottom'])for(const keepMounted of [false,true])for(const portal of [false,true]){
 const p={variant,open,anchor,ModalProps:{disablePortal:!portal,keepMounted},slotProps:{paper:{id:'paper',role:'dialog','aria-modal':true,'data-mui-focusable':''}},classes:{root:'caller',paper:'paper'},transitionDuration:30};
 assert.equal(norm(r(h(own.Drawer,p,'Body'))),norm(r(h(up.Drawer,p,'Body'))),JSON.stringify({name,p}));checks++;
 }
}
assert.deepEqual(own.drawerClasses,peer('@mui/material').drawerClasses);console.log(checks+' Drawer current/app SSR, variant, edge, portal and retained-content comparisons pass');

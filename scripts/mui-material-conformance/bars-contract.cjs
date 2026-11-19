'use strict';process.env.NODE_ENV='production';
const assert=require('node:assert/strict'),{peer}=require('./paths.cjs'),R=peer('react'),h=R.createElement,r=peer('react-dom/server').renderToStaticMarkup,M=require(require('./prepare.cjs'));
function norm(s){return s.replace(/<style[\s\S]*?<\/style>/g,'').replace(/ class="([^"]*)"/g,(_,v)=>' class="'+[...new Set(v.split(' ').filter(c=>c&&!c.startsWith('css-')))].sort().join(' ')+'"').replace(/<([\w-]+)([^>]*)>/g,(_,tag,a)=>'<'+tag+[...a.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>' '+x[1]+'="'+x[2]+'"').sort().join('')+'>');}
let checks=0;
for(const version of ['@mui/material','mui-material-app']){
 const U=peer(version);assert.deepEqual(M.appBarClasses,U.appBarClasses);assert.deepEqual(M.toolbarClasses,U.toolbarClasses);
 for(const color of ['default','primary','secondary','inherit','transparent','error','warning','info','success'])for(const position of ['fixed','absolute','sticky','static','relative'])for(const variant of ['regular','dense'])for(const disableGutters of [false,true]){
 const props={color,position},toolbar={variant,disableGutters};const element=m=>h(m.AppBar,props,h(m.Toolbar,toolbar,'VentiMath'));assert.equal(norm(r(element(M))),norm(r(element(U))),version+JSON.stringify({props,toolbar}));checks++;
 }
 for(const props of [{component:'footer',elevation:0},{square:false,variant:'outlined'},{color:undefined,position:undefined,classes:{root:'root',positionFixed:'fixed',colorPrimary:'color'}},{component:'section',style:{padding:10}}]){assert.equal(norm(r(h(M.AppBar,props,'Bar'))),norm(r(h(U.AppBar,props,'Bar'))));checks++;}
 for(const props of [{component:'nav',variant:'dense'},{variant:'compact',classes:{root:'custom'}},{disableGutters:undefined,variant:undefined}]){assert.equal(norm(r(h(M.Toolbar,props,'Tools'))),norm(r(h(U.Toolbar,props,'Tools'))));checks++;}
 const theme=peer(version+'/styles').createTheme({components:{MuiAppBar:{defaultProps:{elevation:0,position:'static',color:'default',enableColorOnDark:true}},MuiToolbar:{defaultProps:{disableGutters:true,variant:'dense'}}}});
 assert.equal(norm(r(h(M.ThemeProvider,{theme},h(M.AppBar,null,h(M.Toolbar,null,'Shell'))))),norm(r(h(U.ThemeProvider,{theme},h(U.AppBar,null,h(U.Toolbar,null,'Shell'))))));checks++;
}
console.log(checks+' current/app AppBar and Toolbar markup, state, classes, root and theme-default comparisons pass');

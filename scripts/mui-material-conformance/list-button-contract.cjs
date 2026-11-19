'use strict';process.env.NODE_ENV='production';
const assert=require('node:assert/strict'),{peer}=require('./paths.cjs'),R=peer('react'),h=R.createElement,r=peer('react-dom/server').renderToStaticMarkup,M=require(require('./prepare.cjs'));
function norm(html){return html.replace(/<span class="MuiTouchRipple-root" aria-hidden="true" style="[^"]*"><\/span>/g,'').replace(/<style[\s\S]*?<\/style>/g,'').replace(/ class="([^"]*)"/g,(_,s)=>' class="'+[...new Set(s.split(' ').filter(c=>c&&!c.startsWith('css-')))].sort().join(' ')+'"').replace(/<([\w-]+)([^>]*)>/g,(_,tag,attrs)=>'<'+tag+[...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>' '+x[1]+'="'+x[2]+'"').sort().join('')+'>');}
let checks=0;
for(const version of ['@mui/material','mui-material-app']){
 const U=peer(version);assert.deepEqual(M.listItemButtonClasses,U.listItemButtonClasses);
 for(const dense of [false,true])for(const parentDense of [false,true])for(const selected of [false,true])for(const disabled of [false,true])for(const alignItems of ['center','flex-start'])for(const disableGutters of [false,true])for(const divider of [false,true])for(const component of ['div','a','button']){
  const props={dense,selected,disabled,alignItems,disableGutters,divider,component,...(component==='a'?{href:'#contests'}:{}),disableRipple:true};
  const element=m=>h(m.List,{dense:parentDense},h(m.ListItemButton,props,h(m.ListItemIcon,null,'*'),h(m.ListItemText,{primary:'Contests',secondary:'Season'})));
  assert.equal(norm(r(element(M))),norm(r(element(U))),version+JSON.stringify({parentDense,...props}));checks++;
 }
 const Router=R.forwardRef(({to,...props},ref)=>h('a',{...props,href:to,ref}));
 for(const p of [{href:'#contest'},{component:Router,to:'#contest'},{autoFocus:true},{classes:{root:'custom',selected:'chosen'},selected:true}]){assert.equal(norm(r(h(M.ListItemButton,p,'Contest'))),norm(r(h(U.ListItemButton,p,'Contest'))),version+JSON.stringify(p));checks++;}
 const theme=peer(version+'/styles').createTheme({components:{MuiListItemButton:{defaultProps:{dense:true,selected:true,disableGutters:true},styleOverrides:{root:{padding:'6px 8px'}}}}});
 assert.equal(norm(r(h(M.ThemeProvider,{theme},h(M.ListItemButton,null,'Menu')))),norm(r(h(U.ThemeProvider,{theme},h(U.ListItemButton,null,'Menu')))));checks++;
}
console.log(checks+' current/app ListItemButton state, density, descendants, link/root and theme-default comparisons pass');

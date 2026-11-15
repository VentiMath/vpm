'use strict';
process.env.NODE_ENV='production';
const assert=require('node:assert/strict'),{peer}=require('./paths.cjs'),R=peer('react'),h=R.createElement,render=peer('react-dom/server').renderToStaticMarkup,own=require(require('./prepare.cjs'));
function norm(s){return s.replace(/<span class="MuiTouchRipple-root" aria-hidden="true" style="[^"]*"><\/span>/g,'').replace(/<style[\s\S]*?<\/style>/g,'').replace(/ class="([^"]*)"/g,(_,s)=>' class="'+[...new Set(s.split(' ').filter(c=>!c.startsWith('css-')))].sort().join(' ')+'"').replace(/<([\w-]+)([^>]*)>/g,(_,tag,attrs)=>'<'+tag+[...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>' '+x[1]+'="'+x[2]+'"').sort().join('')+'>');}
let count=0;
for(const version of ['@mui/material','mui-material-app']){const control=peer(version);
 const cases=[];
 for(const dense of [false,true])for(const disabled of [false,true])for(const selected of [false,true])for(const disableGutters of [false,true])for(const divider of [false,true])for(const component of ['li','div','a','button'])cases.push(['MenuItem',{dense,disabled,selected,disableGutters,divider,component,...(component==='a'?{href:'#contest'}:{})}]);
 for(const dense of [false,true])for(const disablePadding of [false,true])for(const component of ['ul','nav'])cases.push(['List',{dense,disablePadding,component}]);
 for(const primary of ['Contest',0,''])for(const secondary of [undefined,'Details',0])for(const inset of [false,true])for(const disableTypography of [false,true])cases.push(['ListItemText',{primary,secondary,inset,disableTypography}]);
 for(const color of ['default','primary','inherit'])for(const disableGutters of [false,true])for(const disableSticky of [false,true])for(const inset of [false,true])cases.push(['ListSubheader',{color,disableGutters,disableSticky,inset}]);
 cases.push(['ListItemIcon',{}]);
 for(const [name,props]of cases){
  const element=m=>{const child=h(m[name],props,name==='ListItemText'?undefined:'Contest');return name==='MenuItem'?h(m.MenuList,null,child):child;};
  let actual=norm(render(element(own))),expected=norm(render(element(control)));
  // Material9 begins items at -1 during SSR; app7 gives its first enabled item 0.
  if(version==='mui-material-app'&&name==='MenuItem'&&!props.disabled){assert.ok(expected.includes('tabindex="0"'));expected=expected.replace('tabindex="0"','tabindex="-1"');}
  assert.equal(actual,expected,version+' '+name+' '+JSON.stringify(props));count++;
 }
}
console.log(count+' list/menu-item SSR comparisons pass');

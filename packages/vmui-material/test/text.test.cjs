"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict');
const {peer}=require('../../../scripts/mui-material-conformance/paths.cjs'),React=peer('react'),render=peer('react-dom/server').renderToStaticMarkup;
const api=require(require('../../../scripts/mui-material-conformance/prepare.cjs')),h=React.createElement;
const strip=s=>s.replace(/<style[\s\S]*?<\/style>/g,'');
test('headings, body defaults and explicit undefined preserve semantic elements',()=>{
 assert.match(strip(render(h(api.Typography,{variant:'h2'},'Title'))),/^<h2/);
 assert.match(strip(render(h(api.Typography,{variant:undefined},'Body'))),/^<p/);
 assert.match(strip(render(h(api.Typography,{variant:'h1',variantMapping:{h1:'h3'},component:'section'},'Title'))),/^<section/);
 assert.match(strip(render(h(api.Typography,{paragraph:true,variant:'caption'},'Body'))),/^<p/);
});
test('text and icon titles escape markup and strip internal props',()=>{
 const text=render(h(api.Typography,{noWrap:true,gutterBottom:true,variantMapping:{},sx:{width:100}},'<script>x</script>'));
 assert.match(text,/&lt;script&gt;/);assert.doesNotMatch(strip(text),/noWrap=|gutterBottom=|variantMapping=|ownerState=|sx=/);
 const icon=render(h(api.SvgIcon,{titleAccess:'<img onerror=x>',fontSize:undefined},h('path',{d:'M0 0h2'})));
 assert.match(icon,/<title>&lt;img onerror=x&gt;<\/title>/);assert.match(icon,/role="img"/);assert.doesNotMatch(icon,/aria-hidden="true"|NaN/);
});
test('icon accessibility and explicit attributes survive',()=>{
 assert.match(render(h(api.SvgIcon)),/aria-hidden="true"/);
 const icon=render(h(api.SvgIcon,{'aria-label':'Calendar','aria-hidden':false,role:'img',htmlColor:'#123456',viewBox:'0 0 40 20'}));
 assert.match(icon,/aria-label="Calendar"/);assert.match(icon,/aria-hidden="false"/);assert.match(icon,/color="#123456"/);assert.match(icon,/viewBox="0 0 40 20"/);
});
test('SVG children flatten without mutation; explicit root attributes win',()=>{
 const child=h('svg',{viewBox:'0 0 32 16',stroke:'currentColor',fill:'none','aria-hidden':true},h('path',{d:'M0 0h32'}));
 const icon=strip(render(h(api.SvgIcon,{'aria-hidden':false,role:'img'},child)));
 assert.equal((icon.match(/<svg/g)||[]).length,1);assert.match(icon,/viewBox="0 0 32 16"/);assert.match(icon,/fill="none"/);assert.match(icon,/aria-hidden="false"/);
 assert.equal(child.props['aria-hidden'],true);
});
test('custom SVG component retains its own viewBox',()=>{
 const Custom=React.forwardRef((props,ref)=>h('svg',{viewBox:'0 0 96 48',...props,ref}));
 assert.match(render(h(api.SvgIcon,{component:Custom,inheritViewBox:true,viewBox:'0 0 1 1'})),/viewBox="0 0 96 48"/);
});
test('prototype-named typography variants and icon sizes do not read inherited values',()=>{
 for(const variant of ['constructor','toString','__proto__']){
  const text=render(h(api.Typography,{variant},'Title'));assert.match(strip(text),/^<span/);assert.doesNotMatch(text,/function Object|native code/);
  const icon=render(h(api.SvgIcon,{fontSize:variant}));assert.doesNotMatch(icon,/NaN|native code/);
 }
});
test('createSvgIcon uses supplied paths, title, classes and fixed public identity',()=>{
 const Icon=api.createSvgIcon(h('path',{d:'M1 2h3'}),'Contest');
 assert.equal(Icon.muiName,'SvgIcon');assert.equal(Icon.displayName,'ContestIcon');
 const icon=render(h(Icon,{titleAccess:'Contest',fontSize:'small',classes:{root:'mine'}}));
 assert.match(icon,/d="M1 2h3"/);assert.match(icon,/<title>Contest<\/title>/);assert.match(icon,/mine/);
});
test('Link retains native navigation/form semantics and separate typography classes',()=>{
 const anchor=render(h(api.Link,{href:'/contest',target:'_blank',rel:'noopener',TypographyClasses:{root:'text'},classes:{root:'link'},underline:'hover'},'Open'));
 assert.match(anchor,/<a /);assert.match(anchor,/href="\/contest"/);assert.match(anchor,/MuiTypography-root text/);assert.match(anchor,/MuiLink-root link/);
 const button=strip(render(h(api.Link,{component:'button',type:'button',disabled:true},'Action')));assert.match(button,/type="button"/);assert.match(button,/disabled=""/);assert.doesNotMatch(button,/underline=|TypographyClasses=/);
});
test('legacy direct system/color/paragraph props remain scoped to styles',()=>{
 const text=render(h(api.Typography,{paragraph:true,m:2,fontWeight:700,color:'text.secondary'},'Body'));
 assert.match(text,/color:rgba\(0,0,0,.6\)/);assert.match(text,/font-weight:700/);assert.doesNotMatch(strip(text),/paragraph=| m=|fontWeight=/);
});

test('titleAccess makes a wrapped decorative SVG accessible unless the root explicitly hides it',()=>{
 const child=h('svg',{'aria-hidden':true},h('path',{d:'M0 0h2'}));
 const icon=strip(render(h(api.SvgIcon,{titleAccess:'Contest'},child)));
 assert.match(icon,/role="img"/);assert.doesNotMatch(icon,/aria-hidden="true"/);
 assert.match(strip(render(h(api.SvgIcon,{titleAccess:'Contest','aria-hidden':true},child))),/aria-hidden="true"/);
});

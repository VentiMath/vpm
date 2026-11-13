"use strict";
const assert=require('node:assert/strict');
const {peer}=require('./paths.cjs'),React=peer('react'),render=peer('react-dom/server').renderToStaticMarkup;
const own=require(require('./prepare.cjs')),h=React.createElement;
const path=h('path',{d:'M0 0h24v24z'});
function normalized(html){return html.replace(/<style[\s\S]*?<\/style>/g,'').replace(/ class="[^"]*"/g,'').replace(/ style="[^"]*"/g,'').replace(/<([\w-]+)([^>]*)>/g,(_,tag,attrs)=>'<'+tag+[...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>' '+x[1]+'="'+x[2]+'"').sort().join('')+'>');}
const cases=[];
for(const variant of ['h1','h2','h3','h4','h5','h6','subtitle1','subtitle2','body1','body2','button','caption','overline','inherit','custom'])
 for(const opts of [{},{component:'div'},{variantMapping:{h1:'h2',body1:'section'}},{align:'center',noWrap:true,gutterBottom:true}])cases.push(['Typography',{variant,...opts},'Contest <title>']);
for(const component of ['a','button','span'])for(const underline of ['none','hover','always'])cases.push(['Link',{component,underline,...(component==='a'?{href:'/contest',target:'_blank',rel:'noreferrer'}:{type:component==='button'?'button':undefined})},'Contest']);
for(const fontSize of ['small','medium','large','inherit'])for(const opts of [{},{titleAccess:'Contest <icon>'},{viewBox:'0 0 32 20',htmlColor:'#123456'},{'aria-label':'Search','aria-hidden':false,role:'img'},{color:'secondary',shapeRendering:'crispEdges'}])cases.push(['SvgIcon',{fontSize,...opts},path]);
const Custom=React.forwardRef((props,ref)=>h('svg',{viewBox:'0 0 100 50',...props,ref}));
cases.push(['SvgIcon',{component:Custom,inheritViewBox:true},path]);
cases.push(['SvgIcon',{},h('svg',{viewBox:'0 0 32 16',fill:'none',stroke:'currentColor'},path)]);
let checks=0;
for(const name of ['@mui/material','mui-material-app']){const upstream=peer(name);for(const [tag,props,child]of cases){assert.equal(normalized(render(h(own[tag],props,child))),normalized(render(h(upstream[tag],props,child))),name+' '+tag+' '+JSON.stringify(props));checks++;}}
console.log(checks+' text/link/icon markup and accessibility comparisons match current and app Material');

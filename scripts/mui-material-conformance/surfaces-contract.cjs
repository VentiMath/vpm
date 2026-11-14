'use strict';
const assert=require('node:assert/strict');
const {peer}=require('./paths.cjs'),R=peer('react'),h=R.createElement,render=peer('react-dom/server').renderToStaticMarkup;
const own=require(require('./prepare.cjs'));
const normalize=html=>html.replace(/<style[\s\S]*?<\/style>/g,'').replace(/ class="[^"]*"/g,'').replace(/ style="[^"]*"/g,'').replace(/<([\w-]+)([^>]*)>/g,(_,tag,attrs)=>'<'+tag+[...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>' '+x[1]+'="'+x[2]+'"').sort().join('')+'>');
const cases=[];
for(let elevation=0;elevation<=24;elevation++)for(const square of [false,true])for(const variant of ['elevation','outlined'])cases.push(['Paper',{elevation,square,variant},'Contest']);
for(const orientation of ['horizontal','vertical'])for(const variant of ['fullWidth','inset','middle'])for(const flexItem of [false,true])for(const child of [null,'Contest',0,false,''])for(const textAlign of ['left','center','right'])cases.push(['Divider',{orientation,variant,flexItem,textAlign},child]);
for(const props of [{component:'li'},{component:'div'},{orientation:'vertical',role:'presentation'},{orientation:'vertical',role:'none'},{orientation:'vertical','aria-orientation':'horizontal'},{absolute:true},{component:'section','aria-label':'Contest separator'}])cases.push(['Divider',props,null]);
for(const color of ['inherit','primary','secondary','error','info','success','warning','action','disabled'])for(const fontSize of ['small','medium','large','inherit'])cases.push(['Icon',{color,fontSize},'palette']);
for(const props of [{baseClassName:'material-symbols-rounded'},{component:'i',role:'img','aria-hidden':false,'aria-label':'Palette'},{component:'a',href:'/contest'}])cases.push(['Icon',props,'palette']);
let checks=0;
for(const control of ['@mui/material','mui-material-app']){
 const upstream=peer(control);
 for(const [name,props,child]of cases){assert.equal(normalize(render(h(own[name],props,child))),normalize(render(h(upstream[name],props,child))),control+' '+name+' '+JSON.stringify(props)+' child:'+JSON.stringify(child));checks++;}
}
console.log(checks+' Paper/Divider/Icon root and accessibility comparisons pass current/app controls');

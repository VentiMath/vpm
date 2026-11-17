'use strict';process.env.NODE_ENV='production';
const assert=require('node:assert/strict'),same=require('node:util').isDeepStrictEqual,a=require(process.env.VCSS_NATIVE_ENTRY||'../../packages/vcss-to-react-native'),b=require('css-to-react-native');
const props=['margin','padding','border-width','border-radius','border-color','border','background','font','font-family','font-weight','font-variant','transform','aspect-ratio','flex','flex-flow','place-content','text-shadow','box-shadow','text-decoration','text-decoration-line','shadow-offset','color','top','opacity'];
const values=['','0','1','-1','0px','2PX','2em','3%','auto','none','normal','red','cyan','currentColor','transparent','RED','#123','#1234','#abcdef12','rgb(1,2,3)','rgb(x)','1px solid red','rgb(1,2,3) solid','1px 2px','1px 2px 3px','1 2','true','false','null','undefined','normal bold','small-caps','hello world','"Arial"','12px Arial','normal 12px Arial','1px/2px','scale(2)','rotate(0)','rotate(2rad)','translate(20%, 0)','matrix(1,0,0,1,0,0)','foo(1)','1/0','none underline','red underline','row wrap','center','space-around','2px /*x*/ 3px','var(--x)'];
function call(lib,p,v){try{return {value:lib.default([[p,v]])}}catch{return {error:true}}}
let compared=0,differences=0;
for(const p of props)for(const v of values){const x=call(a,p,v),y=call(b,p,v);if(!same(x,y)){
 const documented=(['cyan','RED'].includes(v)&&['border-color','border','background','text-decoration'].includes(p)) || (v==='2px /*x*/ 3px'&&['margin','padding','border-width','border-radius','text-shadow','box-shadow','shadow-offset','font-weight'].includes(p)) || (p==='font-weight'&&x.error&&!y.error) || (p==='background'&&x.error&&!y.error&&['rgb(1,2,3) solid','red underline'].includes(v)) || (p==='transform'&&v==='none') || (p==='text-decoration-line'&&v==='none underline') || (p==='shadow-offset'&&v==='2em');
 assert(documented,JSON.stringify({p,v,x,y}));differences++;
}else compared++;}
assert.equal(differences,34);
const colors=require('../../packages/vcss-color-keywords');
for(const c of Object.keys(colors).filter(c=>c!=='cyan'&&c!=='magenta'))for(const p of ['border','box-shadow','text-shadow','background']){const v=p==='border'?'2px solid '+c:p==='background'?c:'1px 2px 3px '+c;assert.deepEqual(call(a,p,v),call(b,p,v));compared++;}
console.log(`${compared} converter comparisons pass; ${differences} explicitly classified behavior improvements`);

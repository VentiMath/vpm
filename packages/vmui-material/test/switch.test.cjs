'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{peer}=require('../../../scripts/mui-material-conformance/paths.cjs'),R=peer('react'),h=R.createElement,r=peer('react-dom/server').renderToStaticMarkup,own=require(require('../../../scripts/mui-material-conformance/prepare.cjs'));
const clean=s=>s.replace(/<style[\s\S]*?<\/style>/g,'');
for(const [name,api]of [['VPM',own],['Material9',peer('@mui/material')],['app7',peer('mui-material-app')]]){
 test(name+' checked ownership, icons and explicit false overrides',()=>{
  const html=clean(r(h(api.FormControl,{disabled:true},h(api.Switch,{id:'toggle',defaultChecked:true,disabled:false,checkedIcon:h('b',null,'On'),icon:h('i',null,'Off'),slotProps:{input:{'aria-label':'Email'}}}))));
  assert.match(html,/checked=""/);assert.match(html,/<b>On<\/b>/);assert.doesNotMatch(html,/disabled=""/);assert.match(html,/aria-label="Email"/);
 });
 test(name+' input slot wins over legacy aliases and publishes native form attributes',()=>{
  const html=clean(r(h(api.Switch,{name:'email',required:true,readOnly:true,value:'all',tabIndex:3,...(name==='Material9'?{}:{inputProps:{'aria-label':'Old'}}),slotProps:{input:{'aria-label':'New'}}})));
  const input=html.match(/<input[^>]*>/)[0];for(const text of ['name="email"','required=""','readOnly=""','value="all"','tabindex="3"','aria-label="New"'])assert.ok(input.includes(text),text);assert.doesNotMatch(input,/Old/);
 });
}
test('all five slots receive owner state; native slots omit internal attributes',()=>{
 const slots={root:'span',switchBase:'span',input:'input',thumb:'b',track:'i'},seen=[];
 const slotProps=Object.fromEntries(Object.keys(slots).map(slot=>[slot,state=>{seen.push([slot,state.checked,state.size]);return {'data-slot':slot,ownerState:{private:true}}}]));
 const html=clean(r(h(own.Switch,{slots,slotProps,defaultChecked:true,size:'small'})));
 assert.equal(seen.length,5);assert.ok(seen.every(s=>s[1]===true&&s[2]==='small'));assert.doesNotMatch(html,/ownerState|\[object Object\]/);for(const slot of Object.keys(slots))assert.ok(html.includes('data-slot="'+slot+'"'));
});
test('top-level Fuse labels name the native switch; explicit input label wins',()=>{
 const input=props=>clean(r(h(own.Switch,props))).match(/<input[^>]*>/)[0];
 assert.match(input({'aria-label':'Fuse preference'}),/aria-label="Fuse preference"/);
 assert.match(input({'aria-label':'Outer',slotProps:{input:{'aria-label':'Native'}}}),/aria-label="Native"/);
});

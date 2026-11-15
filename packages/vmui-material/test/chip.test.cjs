'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{peer}=require('../../../scripts/mui-material-conformance/paths.cjs'),R=peer('react'),h=R.createElement,r=peer('react-dom/server').renderToStaticMarkup,own=require(require('../../../scripts/mui-material-conformance/prepare.cjs'));
const clean=s=>s.replace(/<style[\s\S]*?<\/style>/g,'');
for(const [name,api]of [['VPM',own],['Material9',peer('@mui/material')],['app7',peer('mui-material-app')]]){
 test(name+' labels remain text, avatar wins over icon, custom delete icon retains class',()=>{
  const html=clean(r(h(api.Chip,{label:'<script>x</script>',avatar:h('span',null,'Student'),icon:h('svg'),onDelete(){},deleteIcon:h('svg',{className:'close'})})));
  assert.match(html,/&lt;script&gt;x&lt;\/script&gt;/);assert.match(html,/Student/);assert.equal((html.match(/<svg/g)||[]).length,1);assert.match(html,/MuiChip-deleteIcon[^\"]*close|close[^\"]*MuiChip-deleteIcon/);
 });
 test(name+' clickable styling is independent of the supplied click callback',()=>{
  const plain=clean(r(h(api.Chip,{label:'Status',clickable:false,onClick(){}}))),button=clean(r(h(api.Chip,{label:'Status',clickable:true})));
  assert.doesNotMatch(plain,/role="button"|MuiChip-clickable/);assert.match(button,/role="button"/);
 });
 test(name+' anchors, native button type and explicit accessibility attributes survive',()=>{
  assert.match(clean(r(h(api.Chip,{component:'a',href:'/contest',label:'Contest',clickable:true}))),/<a[^>]*href="\/contest"/);
  const html=clean(r(h(api.Chip,{component:'button',type:'submit',label:'Save',clickable:true,'aria-label':'Save preference'})));assert.match(html,/<button/);assert.match(html,/type="submit"/);assert.match(html,/aria-label="Save preference"/);
 });
}
test('disabled deletable Chip exposes disabled semantics without losing requested focus policy',()=>{
 for(const skip of [false,true]){
  const html=clean(r(h(own.Chip,{label:'Student',disabled:true,skipFocusWhenDisabled:skip,onDelete(){}})));
  assert.match(html,/aria-disabled="true"/);assert.match(html,new RegExp('tabindex="'+(skip?-1:0)+'"'));
 }
});
test('root and label slots receive resolved state; native slots do not leak state',()=>{
 const seen=[],html=clean(r(h(own.Chip,{label:'Slots',size:'small',slots:{root:'article',label:'b'},slotProps:Object.fromEntries(['root','label'].map(slot=>[slot,state=>{seen.push([slot,state.size]);return {'data-slot':slot,ownerState:{private:true}}}]))})));
 assert.deepEqual(seen,[['root','small'],['label','small']]);assert.match(html,/<article/);assert.match(html,/<b/);assert.doesNotMatch(html,/ownerState|\[object Object\]/);
});

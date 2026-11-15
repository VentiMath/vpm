'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{peer}=require('../../../scripts/mui-material-conformance/paths.cjs'),R=peer('react'),h=R.createElement,r=peer('react-dom/server').renderToStaticMarkup,own=require(require('../../../scripts/mui-material-conformance/prepare.cjs'));
const clean=s=>s.replace(/<style[\s\S]*?<\/style>/g,'');
for(const [name,api]of [['VPM',own],['Material9',peer('@mui/material')],['app7',peer('mui-material-app')]]){
 test(name+' group selection preserves string coercion, object identity and explicit child overrides',()=>{
  const object={id:1};const render=(value,props)=>clean(r(h(api.RadioGroup,{name:'group',value},h(api.Radio,{id:'radio',value:object,...props}))));
  assert.match(render(object,{}),/checked=""/);assert.doesNotMatch(render({id:1},{}),/checked=""/);
  assert.match(render(2,{value:'2'}),/checked=""/);assert.doesNotMatch(render(2,{value:'2',checked:false,name:'own'}),/checked=""/);assert.match(render(2,{value:'2',name:'own'}),/name="own"/);
 });
 test(name+' group context isolates nested groups and explicit false overrides disabled context',()=>{
  const html=clean(r(h(api.FormControl,{disabled:true,error:true},h(api.RadioGroup,{name:'outer',defaultValue:'a'},h(api.Radio,{value:'a',disabled:false}),h(api.RadioGroup,{name:'inner',defaultValue:'b'},h(api.Radio,{value:'a'}))))));
  const inputs=[...html.matchAll(/<input[^>]*>/g)].map(m=>m[0]);assert.match(inputs[0],/checked=""/);assert.doesNotMatch(inputs[0],/disabled=""/);assert.match(inputs[1],/disabled=""/);assert.doesNotMatch(inputs[1],/checked=""/);assert.match(html,/Mui-error/);
 });
}
test('native slots omit internal props and hook shares group value',()=>{
 let state;function Read(){state=own.useRadioGroup();return null;}
 const html=clean(r(h(own.RadioGroup,{name:'flight',value:'early'},h(Read),h(own.Radio,{value:'early',slots:{input:'input'},slotProps:{input:s=>({'aria-label':s.checked?'Selected':'Not selected'})}}))));
 assert.equal(state.value,'early');assert.equal(state.name,'flight');assert.match(html,/aria-label="Selected"/);assert.doesNotMatch(html,/ownerState|\[object Object\]/);
});

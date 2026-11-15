'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{peer}=require('../../../scripts/mui-material-conformance/paths.cjs'),R=peer('react'),h=R.createElement,r=peer('react-dom/server').renderToStaticMarkup,own=require(require('../../../scripts/mui-material-conformance/prepare.cjs'));
const clean=s=>s.replace(/<style[\s\S]*?<\/style>/g,'');
for(const [name,api]of [['VPM',own],['Material9',peer('@mui/material')],['app7',peer('mui-material-app')]]){
 test(name+' labels forward only unspecified value/handler props and explicitly override disabled/required',()=>{
  const handler=()=>{},child=()=>{};let props;function Control(p){props=p;return h('input',{type:'checkbox'});}
  r(h(api.FormControl,{disabled:true,required:true,error:true},h(api.FormControlLabel,{control:h(Control,{onChange:child,value:0,checked:false,disabled:true,required:false}),label:'Consent',onChange:handler,checked:true,value:'new',name:'consent',disabled:false,required:true})));
  assert.equal(props.onChange,child);assert.equal(props.value,0);assert.equal(props.checked,false);assert.equal(props.disabled,false);assert.equal(props.required,true);assert.equal(props.name,'consent');
 });
 test(name+' required labels and escaped content preserve native checkbox semantics',()=>{
  const html=clean(r(h(api.FormControlLabel,{control:h(api.Checkbox,{name:'interest',required:true}),label:'<Confirm>'})));
  assert.match(html,/required=""/);assert.match(html,/&lt;Confirm&gt;/);assert.match(html,/aria-hidden="true"[^>]*> \*/);assert.doesNotMatch(html,/role="button"/);
 });
}
test('current native slots and slot callbacks preserve refs/attributes without internal DOM props',()=>{
 let seen;const html=clean(r(h(own.Checkbox,{checked:true,slots:{input:'input'},slotProps:{input:state=>{seen=state;return {'aria-label':'Confirm','data-option':'amc'};}}})));assert.equal(seen.checked,true);assert.match(html,/aria-label="Confirm"/);assert.match(html,/data-option="amc"/);assert.doesNotMatch(html,/ownerState|\[object Object\]/);
});
test('app input and typography aliases stay usable while modern slots win',()=>{
 const html=clean(r(h(own.FormControlLabel,{label:'Confirm',control:h(own.Checkbox,{inputProps:{'aria-label':'legacy'},slotProps:{input:{'aria-label':'modern'}}}),componentsProps:{typography:{component:'b'}},slotProps:{typography:{component:'em'}}})));
 assert.match(html,/<em/);assert.match(html,/aria-label="modern"/);assert.doesNotMatch(html,/componentsProps|aria-label="legacy"/);
});
test('existing Typography is retained and explicit label typography opt-out does not wrap markup',()=>{
 const html=clean(r(h(own.FormControlLabel,{control:h(own.Checkbox),label:h(own.Typography,{id:'text'},'Confirm')})));assert.equal([...html.matchAll(/class="([^"]*)"/g)].filter(m=>m[1].split(' ').includes('MuiTypography-root')).length,1);
 const bare=clean(r(h(own.FormControlLabel,{control:h(own.Checkbox),label:h('b',null,'Confirm'),disableTypography:true})));assert.match(bare,/<b>Confirm<\/b>/);assert.doesNotMatch(bare,/MuiTypography-root/);
});

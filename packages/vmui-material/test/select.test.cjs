'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{peer}=require('../../../scripts/mui-material-conformance/paths.cjs'),R=peer('react'),h=R.createElement,r=peer('react-dom/server').renderToStaticMarkup,own=require(require('../../../scripts/mui-material-conformance/prepare.cjs'));
const clean=s=>s.replace(/<style[\s\S]*?<\/style>/g,'');
for(const [name,api]of [['VPM',own],['current Material',peer('@mui/material')]]){
 test(name+' selects objects by identity and multiple labels in option order',()=>{
  const a={id:1},b={id:1};let html=clean(r(h(api.Select,{value:b},h(api.MenuItem,{value:a},'First'),h(api.MenuItem,{value:b},'Second'))));assert.match(html,/>Second<\/div>/);assert.doesNotMatch(html,/>First<\/div>/);
  html=clean(r(h(api.Select,{multiple:true,value:['b','a']},h(api.MenuItem,{value:'a'},'A'),h(api.MenuItem,{value:'b'},'B'))));assert.match(html,/>A, B<\/div>/);assert.match(html,/value="b,a"/);
 });
 test(name+' displayEmpty and renderValue preserve empty, zero and escaped content',()=>{
  const html=clean(r(h(api.Select,{value:0,renderValue:v=>'<'+v+'>'})));assert.match(html,/&lt;0&gt;/);
  assert.match(clean(r(h(api.Select,{value:'',displayEmpty:true},h(api.MenuItem,{value:''},'All')))),/>All<\/div>/);
 });
 test(name+' hidden input attributes do not replace the visible accessible name',()=>{
  const html=clean(r(h(api.Select,{value:'a',inputProps:{'data-probe':'yes','aria-label':'Schedule',style:{color:'red'}}},h(api.MenuItem,{value:'a'},'A'))));assert.match(html,/<div[^>]*aria-label="Schedule"/);assert.match(html,/<input[^>]*data-probe="yes"/);assert.match(html,/style="color:red"/);
 });
 test(name+' invalid multiple values reject before rendering a misleading selection',()=>{assert.throws(()=>r(h(api.Select,{multiple:true,value:'a'},h(api.MenuItem,{value:'a'},'A'))),/array/)});
}
test('default TextField selection is owned and seeds its initial label from defaultValue',()=>{
 const html=clean(r(h(own.TextField,{select:true,defaultValue:'once',label:'Schedule',helperText:'Frequency'},h(own.MenuItem,{value:'once'},'Once'))));assert.match(html,/data-shrink="true"/);assert.match(html,/role="combobox"/);assert.match(html,/aria-describedby=/);assert.match(html,/>Once<\/div>/);
});

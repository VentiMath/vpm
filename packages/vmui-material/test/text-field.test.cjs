'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{peer}=require('../../../scripts/mui-material-conformance/paths.cjs'),R=peer('react'),h=R.createElement,r=peer('react-dom/server').renderToStaticMarkup;
const own=require(require('../../../scripts/mui-material-conformance/prepare.cjs'));
test('label/helper IDs compose with validation and native constraints',()=>{
 const html=r(h(own.TextField,{id:'fee',label:'Fee',helperText:'Whole dollars',error:true,required:true,type:'number',slotProps:{htmlInput:{min:0,max:100,step:5}}}));
 for(const re of [/for="fee"/,/id="fee-label"/,/id="fee-helper-text"/,/aria-describedby="fee-helper-text"/,/aria-invalid="true"/,/min="0"/,/step="5"/,/required=""/])assert.match(html,re);
});
test('legacy aliases are retained without leaking objects; modern slots take precedence',()=>{
 for(const api of [own,peer('mui-material-app')]){
 const html=r(h(api.TextField,{label:'Name',inputProps:{'data-source':'legacy'},InputProps:{readOnly:true},InputLabelProps:{shrink:true},slotProps:{htmlInput:{'data-source':'modern'},input:{readOnly:false},inputLabel:{shrink:false}}}));
 assert.match(html,/data-source="modern"/);assert.doesNotMatch(html,/readOnly|readonly|\[object Object\]/);assert.match(html,/data-shrink="false"/);
 }
});
test('slot callbacks receive resolved owner state and label shrink controls the outline',()=>{
 let seen;const html=r(h(own.TextField,{label:'Name',error:true,size:'small',slotProps:{inputLabel:s=>{seen=s;return {shrink:true}},formHelperText:s=>({component:'aside','data-error':s.error})},helperText:'Help'}));
 assert.equal(seen.variant,'outlined');assert.equal(seen.error,true);assert.equal(seen.size,'small');assert.match(html,/max-width:100%/);assert.match(html,/<aside/);
});
test('caller select slot gets the input contract, and missing implementations reject explicitly',()=>{
 for(const api of [own,peer('@mui/material')]){
 let seen;const Select=p=>{seen=p;return p.input;};const html=r(h(api.TextField,{id:'kind',label:'Kind',helperText:'Choose',select:true,value:'a',slots:{select:Select}},h('option',{value:'a'},'A')));
 assert.match(html,/<div[^>]*id="kind-label"|<div[^>]*class="[^"]*MuiInputLabel-root/);assert.doesNotMatch(html,/<label[^>]*for="kind"/);assert.equal(seen.id,'kind');assert.equal(seen.labelId,'kind-label');assert.equal(seen['aria-describedby'],'kind-helper-text');assert.equal(seen.input.props.id,undefined);assert.equal(seen.input.props.label,'Kind');assert.equal(seen.value,'a');
 }
 assert.throws(()=>r(h(own.TextField,{select:true})),/Select\/MenuItem/);assert.throws(()=>r(h(own.TextField,{variant:'filled'})),/FilledInput/);
});
test('custom native slots do not receive ownerState objects and themes retain textfield root overrides',()=>{
 const theme=peer('@mui/material/styles').createTheme({components:{MuiTextField:{defaultProps:{size:'small'},styleOverrides:{root:{maxWidth:250}}}}});
 const html=r(h(own.ThemeProvider,{theme},h(own.TextField,{id:'custom',label:'Name',helperText:'Help',slots:{inputLabel:'label',formHelperText:'aside'},slotProps:{htmlInput:{'aria-label':'Custom'}}})));
 assert.doesNotMatch(html,/ownerState/);assert.match(html,/max-width:250px/);assert.match(html,/MuiInputBase-sizeSmall/);assert.match(html,/aria-label="Custom"/);
});

test('placeholder, autocomplete and native input slot survive form composition',()=>{
 for(const api of [own,peer('@mui/material')]){
 const html=r(h(api.TextField,{placeholder:'Search contests',autoComplete:'off',slots:{htmlInput:'input'},slotProps:{htmlInput:{'aria-label':'Search',maxLength:30}}}));
 assert.match(html,/placeholder="Search contests"/);assert.match(html,/autoComplete="off"/);assert.match(html,/aria-label="Search"/);assert.match(html,/maxLength="30"/);assert.doesNotMatch(html,/ownerState/);
 }
});

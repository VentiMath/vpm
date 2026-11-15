'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {peer}=require('../../../scripts/mui-material-conformance/paths.cjs'),R=peer('react'),h=R.createElement,render=peer('react-dom/server').renderToStaticMarkup;
const api=require(require('../../../scripts/mui-material-conformance/prepare.cjs')),theme=peer('@mui/material/styles').createTheme;
test('label shrink uses live form state, with explicit false taking precedence',()=>{
 for(const M of [api,peer('@mui/material')])for(const input of [{defaultValue:0},{startAdornment:'$'}]){
  let html=render(h(M.FormControl,null,h(M.InputLabel,{htmlFor:'field'},'Name'),h(M.Input,{...input,id:'field'})));
  assert.match(html,/data-shrink="true"/);
  html=render(h(M.FormControl,{focused:true},h(M.InputLabel,{shrink:false},'Name'),h(M.Input,input)));
  assert.match(html,/data-shrink="false"/);
 }
});
test('adornment isolates form context while retaining its own inherited styling state',()=>{
 for(const M of [api,peer('@mui/material')]){
  function Child(){assert.equal(M.useFormControl(),null);return h(M.FormLabel,null,'Child');}
  const html=render(h(M.FormControl,{required:true,error:true,hiddenLabel:true,size:'small',variant:'filled'},h(M.InputAdornment,{position:'start'},h(Child))));
  assert.match(html,/MuiInputAdornment-hiddenLabel/);assert.match(html,/MuiInputAdornment-sizeSmall/);assert.doesNotMatch(html,/MuiFormLabel-asterisk/);
 }
});
test('label base, slot overrides and sx compose; required text is escaped and asterisk hidden',()=>{
 const t=theme({components:{MuiFormLabel:{styleOverrides:{root:{fontSize:12}}},MuiInputLabel:{defaultProps:{color:'secondary'},styleOverrides:{root:{letterSpacing:2},asterisk:{fontWeight:700}}}}});
 const html=render(h(api.ThemeProvider,{theme:t},h(api.InputLabel,{required:true,shrink:true,sx:{maxWidth:123}},'<Name>')));
 for(const pattern of [/font-size:12px/,/letter-spacing:2px/,/font-weight:700/,/max-width:123px/,/MuiFormLabel-colorSecondary/,/aria-hidden="true"/,/&lt;Name&gt;/])assert.match(html,pattern);
 assert.equal(api.getInputLabelUtilityClass('focused'),'Mui-focused');assert.ok(Object.isFrozen(api.inputAdornmentClasses));
});
test('adornment typography opt-out and native custom roots never leak owner state',()=>{
 const html=render(h(api.InputAdornment,{position:'start',disableTypography:true,disablePointerEvents:true,component:'aside','data-unit':'currency'},'<$>'));
 assert.match(html,/<aside/);assert.match(html,/pointer-events:none/);assert.match(html,/aria-hidden="true"/);assert.match(html,/&lt;\$&gt;/);assert.doesNotMatch(html,/MuiTypography|ownerState=/);
});

test('label override callbacks receive inherited focused and required state',()=>{
 for(const M of [api,peer('@mui/material')]){
  let seen;const t=theme({components:{MuiInputLabel:{styleOverrides:{root:({ownerState})=>{seen=ownerState;return {}}}}}});
  render(h(M.ThemeProvider,{theme:t},h(M.FormControl,{focused:true,required:true},h(M.InputLabel,null,'Name'))));
  assert.equal(seen.focused,true);assert.equal(seen.required,true);assert.equal(seen.shrink,true);
 }
});

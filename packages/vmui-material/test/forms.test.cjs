'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {peer}=require('../../../scripts/mui-material-conformance/paths.cjs'),R=peer('react'),h=R.createElement,render=peer('react-dom/server').renderToStaticMarkup;
const api=require(require('../../../scripts/mui-material-conformance/prepare.cjs')),createTheme=peer('@mui/material/styles').createTheme;
test('form text is escaped and required markers are hidden from accessible names',()=>{
 const html=render(h(api.FormControl,{required:true},h(api.FormLabel,{htmlFor:'contest'},'<Contest>'),h(api.FormHelperText,null,'<Help>')));
 assert.match(html,/&lt;Contest&gt;/);assert.match(html,/&lt;Help&gt;/);assert.match(html,/<span aria-hidden="true"[^>]*> \*<\/span>/);assert.doesNotMatch(html,/ required=/);
});
test('blank helper text reserves one line without adding screen reader content',()=>{
 const html=render(h(api.FormHelperText,null,' '));assert.match(html,/<span class="notranslate" aria-hidden="true">​<\/span>/);
 assert.doesNotMatch(render(h(api.FormHelperText,null,'')),/notranslate/);
});
test('per-component defaults, polymorphic roots, slot overrides and explicit flags',()=>{
 const theme=createTheme({components:{MuiFormControl:{defaultProps:{color:'secondary',required:true}},MuiFormLabel:{styleOverrides:{asterisk:{fontWeight:700}}},MuiFormHelperText:{defaultProps:{error:false},styleOverrides:{root:{fontSize:13}}}}});
 const html=render(h(api.ThemeProvider,{theme},h(api.FormControl,{required:undefined,error:true,component:'fieldset'},h(api.FormLabel,{component:'legend'},'Settings'),h(api.FormHelperText,null,'Help'))));
 assert.match(html,/<fieldset/);assert.match(html,/<legend/);assert.match(html,/MuiFormLabel-colorSecondary/);assert.match(html,/font-weight:700/);assert.match(html,/font-size:13px/);assert.doesNotMatch(html,/<p class="[^"]*Mui-error/);
});
test('context is absent outside controls and nested controls reset inheritance',()=>{
 function Probe(){const c=api.useFormControl();return h('output',null,JSON.stringify(c)||'absent')}
 assert.equal(render(h(Probe)),'<output>absent</output>');
 const html=render(h(api.FormControl,{error:true,required:true},h(api.FormControl,null,h(Probe))));assert.match(html,/&quot;error&quot;:false/);assert.match(html,/&quot;required&quot;:false/);
});
test('form utility exports are immutable; palette prototype names are not colors',()=>{
 for(const name of ['formControlClasses','formLabelClasses','formHelperTextClasses'])assert.ok(Object.isFrozen(api[name]));
 assert.equal(api.getFormLabelUtilityClass('disabled'),'Mui-disabled');assert.equal(api.getFormLabelUtilityClass('filled'),'MuiFormLabel-filled');
 const html=render(h(api.FormLabel,{color:'constructor',focused:true},'Safe'));assert.doesNotMatch(html,/function|\[object Object\]/);
});

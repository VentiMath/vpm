'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {peer}=require('../../../scripts/mui-material-conformance/paths.cjs'),R=peer('react'),h=R.createElement,render=peer('react-dom/server').renderToStaticMarkup;
const api=require(require('../../../scripts/mui-material-conformance/prepare.cjs')),createTheme=peer('@mui/material/styles').createTheme;
const markup=node=>render(node).replace(/<style[\s\S]*?<\/style>/g,'');
test('input identity, native constraints, accessible name and explicit state overrides',()=>{
 const html=markup(h(api.FormControl,{required:true,error:true,disabled:true},h(api.InputBase,{id:'count',name:'count',type:'number',disabled:false,error:false,'aria-label':'Count','aria-describedby':'help',inputProps:{min:0,max:100,step:1}})));
 assert.match(html,/<input[^>]*aria-invalid="false"/);assert.match(html,/aria-label="Count"/);assert.match(html,/name="count"/);assert.match(html,/min="0"/);assert.match(html,/max="100"/);assert.doesNotMatch(html,/<input[^>]* disabled=/);assert.match(html,/<input[^>]*required=""/);
});
test('input and slot props override top-level attributes without leaking internal classes',()=>{
 const html=markup(h(api.InputBase,{id:'outer',value:'outer',onChange(){},inputProps:{id:'inner',value:'inner'},slotProps:{input:{id:'slot',value:'slot'}},slots:{root:'section'},classes:{root:'custom'}}));
 assert.match(html,/<section/);assert.match(html,/id="slot"/);assert.match(html,/value="slot"/);assert.doesNotMatch(html,/ classes=|ownerState=|fullWidth=/);
});
test('multiline SSR emits only the editable textarea; measurement is a client resource',()=>{
 const html=markup(h(api.InputBase,{multiline:true,rows:4,defaultValue:'one\n<two>',name:'notes'}));
 assert.equal((html.match(/<textarea/g)||[]).length,1);assert.match(html,/rows="4"/);assert.match(html,/one\n&lt;two&gt;/);assert.doesNotMatch(html,/<input|aria-hidden=/);
});
test('theme defaults, input slot overrides, responsive sx and keyframe opt out',()=>{
 const theme=createTheme({components:{MuiInputBase:{defaultProps:{size:'small'},styleOverrides:{root:{borderRadius:7},input:{paddingLeft:5}}}}});
 const html=render(h(api.ThemeProvider,{theme},h(api.InputBase,{size:undefined,sx:{width:200},disableInjectingGlobalStyles:true})));
 assert.match(html,/MuiInputBase-sizeSmall/);assert.match(html,/border-radius:7px/);assert.match(html,/padding-left:5px/);assert.match(html,/width:200px/);assert.doesNotMatch(html,/@keyframes/);
});
test('native-input subtree is isolated from the outer FormControl context',()=>{
 function Field(props){const context=api.useFormControl();return h('output',null,context?'leaked':'isolated')}
 assert.match(markup(h(api.FormControl,{error:true},h(api.InputBase,{inputComponent:Field}))),/>isolated<\/output>/);
});
test('suffix sees inherited state, while utility classes are immutable',()=>{
 const html=markup(h(api.FormControl,{required:true,disabled:true},h(api.InputBase,{renderSuffix:state=>h('output',null,JSON.stringify({disabled:state.disabled,required:state.required,focused:state.focused}))})));
 assert.match(html,/&quot;disabled&quot;:true/);assert.match(html,/&quot;required&quot;:true/);assert.match(html,/&quot;focused&quot;:false/);assert.ok(Object.isFrozen(api.inputBaseClasses));assert.equal(api.getInputBaseUtilityClass('readOnly'),'Mui-readOnly');
});

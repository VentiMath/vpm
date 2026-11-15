'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {peer}=require('../../../scripts/mui-material-conformance/paths.cjs'),R=peer('react'),h=R.createElement,render=peer('react-dom/server').renderToStaticMarkup;
const api=require(require('../../../scripts/mui-material-conformance/prepare.cjs')),theme=peer('@mui/material/styles').createTheme;
test('recognized Input variants seed SSR filled and adornment state',()=>{
 function State(){return h('output',null,JSON.stringify(api.useFormControl()));}
 for(const Field of [api.Input,api.OutlinedInput]){assert.equal(Field.muiName,'Input');const html=render(h(api.FormControl,null,h(Field,{defaultValue:0,startAdornment:'$',label:'Fee'}),h(State)));assert.match(html,/&quot;filled&quot;:true/);assert.match(html,/&quot;adornedStart&quot;:true/);}
});
test('outlined label is escaped layout text; native accessible name stays caller owned',()=>{
 const html=render(h(api.OutlinedInput,{label:'<Fee>',required:true,'aria-label':'Fee',notched:true}));assert.match(html,/<fieldset aria-hidden="true"/);assert.match(html,/&lt;Fee&gt;/);assert.match(html,/<input[^>]*aria-label="Fee"/);assert.match(html,/max-width:100%/);assert.doesNotMatch(html,/<Fee>/);
 const empty=render(h(api.OutlinedInput));assert.match(empty,/class="notranslate" aria-hidden="true"/);
});
test('explicit notch override, standard underline opt out and utility classes',()=>{
 const html=render(h(api.FormControl,{focused:true},h(api.OutlinedInput,{label:'Contest',notched:false})));assert.match(html,/max-width:0.01px/);assert.doesNotMatch(html,/max-width:100%/);
 assert.doesNotMatch(render(h(api.Input,{disableUnderline:true})),/MuiInput-underline|border-bottom:/);
 assert.match(render(h(api.Input,{classes:{underline:'custom-underline'}})),/MuiInput-underline custom-underline/);assert.doesNotMatch(render(h(api.Input,{disableUnderline:true,classes:{underline:'custom-underline'}})),/custom-underline/);
 assert.ok(Object.isFrozen(api.outlinedInputClasses));assert.equal(api.getInputUtilityClass('focused'),'Mui-focused');
});
test('outline slot callback receives inherited state, supports attributes and class names',()=>{
 let seen;const html=render(h(api.FormControl,{required:true,error:true},h(api.OutlinedInput,{label:'Round',slotProps:{notchedOutline:s=>{seen=s;return {'data-outline':'yes',className:'custom'}}}})));assert.equal(seen.required,true);assert.equal(seen.error,true);assert.match(html,/data-outline="yes"/);assert.match(html,/MuiOutlinedInput-notchedOutline custom/);
});
test('base and variant overrides compose with app padding, defaults and sx',()=>{
 const t=theme({components:{MuiInputBase:{styleOverrides:{input:{letterSpacing:'2px'}}},MuiOutlinedInput:{defaultProps:{color:'secondary'},styleOverrides:{input:{padding:'6px 12px'},inputSizeSmall:{padding:'4px 12px'},notchedOutline:{borderStyle:'dashed'}}}}});
 const html=render(h(api.ThemeProvider,{theme:t},h(api.OutlinedInput,{size:'small',sx:{maxWidth:300},label:'Contest'})));for(const pattern of [/MuiInputBase-colorSecondary/,/letter-spacing:2px/,/padding:4px 12px/,/border-style:dashed/,/max-width:300px/])assert.match(html,pattern);
});

"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict');
const {peer}=require('../../../scripts/mui-material-conformance/paths.cjs');
const R=peer('react'),h=R.createElement,render=peer('react-dom/server').renderToStaticMarkup;
const api=require(require('../../../scripts/mui-material-conformance/prepare.cjs'));
const createTheme=peer('@mui/material/styles').createTheme;
test('standalone Box has Material palette and retains app System props',()=>{
 const html=render(h(api.Box,{component:'section',p:2,sx:{color:'primary.main'}},'Contest'));
 assert.match(html,/<section/);assert.match(html,/MuiBox-root/);assert.match(html,/padding:16px/);assert.match(html,/#1976d2/);assert.doesNotMatch(html,/ p="/);
});
test('scoped themes, callbacks and styled/global consumers resolve the Material theme',()=>{
 const theme=createTheme({spacing:5,palette:{primary:{main:'#123456'}}}),original=theme.spacing;
 const Styled=api.styled(api.Box)(({theme})=>({borderColor:theme.palette.primary.main}));
 function Read(){const theme=api.useTheme();assert.equal(theme.palette.primary.main,'#123456');return h(Styled,{p:2},'Contest');}
 const html=render(h(api.ThemeProvider,
   {theme:{$$material:theme,other:{id:'keep'}}},
   h(api.ThemeProvider,{theme:outer=>({...outer,spacing:()=> '13px'})},h(Read)),
   h(api.GlobalStyles,{styles:t=>({body:{color:t.palette.primary.main}})})
 ));
 assert.match(html,/padding:13px/);assert.match(html,/border-color:#123456/);assert.match(html,/body\{color:#123456/);assert.equal(theme.spacing,original);
});
test('theme provider rejects invalid callbacks instead of falling back silently',()=>{
 assert.throws(()=>render(h(api.ThemeProvider,{theme:()=>null},h(api.Box))),/theme object/);
});

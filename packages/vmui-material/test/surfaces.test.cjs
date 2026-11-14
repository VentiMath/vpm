'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {peer}=require('../../../scripts/mui-material-conformance/paths.cjs'),R=peer('react'),h=R.createElement,render=peer('react-dom/server').renderToStaticMarkup;
const api=require(require('../../../scripts/mui-material-conformance/prepare.cjs')),createTheme=peer('@mui/material/styles').createTheme;
test('Paper standalone elevations have shadow data and no leaked component options',()=>{
 for(let elevation=0;elevation<=24;elevation++){
  const html=render(h(api.Paper,{elevation,square:true},'Contest <one>'));
  assert.match(html,new RegExp('MuiPaper-elevation'+elevation+' '));assert.match(html,/--Paper-shadow:/);assert.doesNotMatch(html,/ elevation=| square=/);assert.match(html,/Contest &lt;one&gt;/);
 }
});
test('Paper rejects undefined shadow indices explicitly',()=>{
 for(const elevation of [-1,25,NaN,Infinity,1.5,'2'])assert.throws(()=>render(h(api.Paper,{elevation})),/integer from 0 to 24/);
});
test('Paper caller styles override shadow variables without mutating the theme or props',()=>{
 const theme=createTheme({palette:{mode:'dark'}}),before=theme.shadows.slice(),style=Object.freeze({'--Paper-shadow':'none','--Paper-overlay':'none'});
 const html=render(h(api.ThemeProvider,{theme},h(api.Paper,{elevation:8,style},'Contest')));
 assert.match(html,/--Paper-shadow:none;--Paper-overlay:none/);assert.deepEqual(theme.shadows,before);assert.equal(style['--Paper-shadow'],'none');
});
test('theme defaults and slot overrides reach Paper, Divider wrapper and Icon',()=>{
 const theme=createTheme({components:{MuiPaper:{defaultProps:{elevation:4},styleOverrides:{rounded:{borderRadius:13}}},MuiDivider:{styleOverrides:{wrapper:{fontWeight:700}}},MuiIcon:{defaultProps:{baseClassName:'contest-font',fontSize:'small'}}}});
 const html=render(h(api.ThemeProvider,{theme},h(api.Paper,{elevation:undefined},h(api.Divider,null,'Round'),h(api.Icon,null,'palette'))));
 assert.match(html,/MuiPaper-elevation4/);assert.match(html,/border-radius:13px/);assert.match(html,/font-weight:700/);assert.match(html,/contest-font notranslate/);assert.match(html,/MuiIcon-fontSizeSmall/);
});
test('vertical and labelled dividers retain separator semantics; presentation opts out',()=>{
 const normal=render(h(api.Divider,{orientation:'vertical'},'Round <two>'));
 assert.match(normal,/role="separator"/);assert.match(normal,/aria-orientation="vertical"/);assert.match(normal,/Round &lt;two&gt;/);
 const decorative=render(h(api.Divider,{orientation:'vertical',role:'presentation'}));assert.match(decorative,/role="presentation"/);assert.doesNotMatch(decorative,/aria-orientation/);
});
test('font icons are decorative unless explicitly exposed and preserve custom classes',()=>{
 assert.match(render(h(api.Icon,null,'palette')),/aria-hidden="true"/);
 const html=render(h(api.Icon,{component:'i',role:'img','aria-hidden':false,'aria-label':'Choose palette',classes:{root:'owned-icon'},baseClassName:'other-font'},'palette'));
 assert.match(html,/aria-hidden="false"/);assert.match(html,/aria-label="Choose palette"/);assert.match(html,/other-font notranslate/);assert.match(html,/owned-icon/);assert.match(html,/<i /);
});
test('utility class exports are frozen; unknown names do not use inherited palette entries',()=>{
 assert.equal(api.getPaperUtilityClass('elevation4'),'MuiPaper-elevation4');assert.equal(api.getDividerUtilityClass('wrapper'),'MuiDivider-wrapper');assert.equal(api.getIconUtilityClass('fontSizeSmall'),'MuiIcon-fontSizeSmall');
 assert.doesNotThrow(()=>render(h(api.ThemeProvider,{theme:createTheme({components:{MuiPaper:{styleOverrides:{root:{padding:1}}}}})},h(api.Paper,{variant:"constructor"},"Contest"))));
 assert.ok(Object.isFrozen(api.paperClasses));assert.ok(Object.isFrozen(api.dividerClasses));assert.ok(Object.isFrozen(api.iconClasses));
 const html=render(h(api.Icon,{color:'constructor',fontSize:'__proto__'},'palette'));assert.doesNotMatch(html,/function|\[object Object\]/);
});

test('Box forwards custom-root color/fontSize to the Icon API',()=>{
 const html=render(h(api.Box,{component:api.Icon,fontSize:'small',color:'primary'},'palette'));
 assert.match(html,/MuiIcon-colorPrimary/);assert.match(html,/MuiIcon-fontSizeSmall/);assert.match(html,/font-size:1.25rem/);assert.doesNotMatch(html,/font-size:small;/);
});

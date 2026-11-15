'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{peer}=require('../../../scripts/mui-material-conformance/paths.cjs'),R=peer('react'),h=R.createElement,r=peer('react-dom/server').renderToStaticMarkup,own=require(require('../../../scripts/mui-material-conformance/prepare.cjs'));
const clean=s=>s.replace(/<style[\s\S]*?<\/style>/g,'');
for(const [name,a]of [['VPM',own],['Material9',peer('@mui/material')],['app7',peer('mui-material-app')]]){
 test(name+' images keep native alt, responsive candidates and request policies',()=>{
  const html=clean(r(h(a.Avatar,{alt:'Student',src:'/small.png',srcSet:'/large.png 2x',sizes:'36px',slotProps:{img:{referrerPolicy:'no-referrer',crossOrigin:'anonymous',loading:'lazy'}}})));
  for(const text of ['alt="Student"','src="/small.png"','srcSet="/large.png 2x"','sizes="36px"','referrerPolicy="no-referrer"','crossorigin="anonymous"','loading="lazy"'])assert.ok(html.includes(text),text);
 });
 test(name+' zero children render, no-source alt alone uses a decorative fallback',()=>{
  assert.match(clean(r(h(a.Avatar,null,0))),/>0<\/div>/);
  const html=clean(r(h(a.Avatar,{alt:'Student'})));assert.match(html,/aria-hidden="true"/);assert.doesNotMatch(html,/<img/);
 });
}
test('slots receive resolved owner state and native roots omit private attributes',()=>{
 const seen=[],html=clean(r(h(own.Avatar,{slots:{root:'article',fallback:'i'},slotProps:{root:s=>{seen.push(s.variant,s.colorDefault);return {'data-root':'yes',ownerState:{private:true}}},fallback:{'aria-hidden':true}}})));
 assert.deepEqual(seen,['circular',true]);assert.match(html,/<article/);assert.match(html,/<i/);assert.doesNotMatch(html,/ownerState|\[object Object\]/);
});
test('modern image slot overrides legacy props and determines the rendered source',()=>{
 const html=clean(r(h(own.Avatar,{src:'/outer.png',imgProps:{src:'/old.png'},slotProps:{img:{src:'/actual.png'}}})));
 assert.match(html,/src="\/actual.png"/);assert.doesNotMatch(html,/old.png|outer.png/);
});

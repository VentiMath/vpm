'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path');
const base=path.resolve(__dirname,'../../../scripts/mui-system-conformance/node_modules/.vpm-motion-react');
const own=require(base+'/vpm.cjs');
for(const kind of ['fade','variants','initial-false'])for(const count of [1,3,12])test(kind+' SSR matches both controls ('+count+' roots)',()=>{
 const actual=own.prepare(kind,count)();
 for(const version of ['current','app'])assert.equal(actual,require(base+'/'+version+'.cjs').prepare(kind,count)());
 assert.equal((actual.match(/Contest /g)||[]).length,count);
});
test('escaped React content, initial keyframes and custom roots',()=>{
 const {React:R,api,renderToString}=own;
 const Root=R.forwardRef((props,ref)=>R.createElement('button',{...props,ref}));
 const Button=api.motion.create(Root);
 assert.equal(Button,api.motion.create(Root));assert.equal(api.motion.div,api.motion.div);
 const html=renderToString(R.createElement(Button,{initial:{x:[null,10,20]},animate:{x:30},'aria-label':'Contest'},'<script>'));
 assert.match(html,/translateX\(10px\)/);assert.match(html,/&lt;script&gt;/);assert.match(html,/<button/);
});
test('rendered inputs remain unchanged and unsupported contracts reject',()=>{
 const {React:R,api,renderToString}=own;
 const target=Object.freeze({x:Object.freeze([0,20]),opacity:0});
 assert.match(renderToString(R.createElement(api.motion.div,{initial:target})),/opacity:0/);
 for(const prop of ['layout','drag','whileHover'])assert.throws(()=>renderToString(R.createElement(api.motion.div,{[prop]:true})),/outside/);
 assert.throws(()=>renderToString(R.createElement(api.motion.div,{transformTemplate:()=>''})),/not implemented/);
});

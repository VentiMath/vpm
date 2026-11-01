'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process');
const ours=require('..'),upstream=require('../../../scripts/react-is-conformance/node_modules/react-is');
const latest=require('../../../scripts/react-is-conformance/node_modules/react-latest'),used=require('../../../scripts/react-is-conformance/node_modules/react');
const tags=['transitional.element','element','portal','fragment','strict_mode','profiler','consumer','context','forward_ref','suspense','suspense_list','memo','lazy','view_transition','client.reference','offscreen','activity'].map(name=>Symbol.for('react.'+name));
test('all public exports and classifiers agree on actual React 19.1 and 19.3 values and generated shapes',()=>{
  assert.deepEqual(Object.keys(ours).sort(),Object.keys(upstream).sort());
  const values=[null,undefined,true,false,0,1,NaN,Infinity,'div','',Symbol(),()=>null,[],{},...tags];
  for(const React of [used,latest]) {
    const component=()=>null,context=React.createContext(null),types=['div',component,React.Fragment,React.StrictMode,React.Suspense,React.Profiler,context.Provider,context.Consumer,React.memo(component),React.forwardRef(component),React.lazy(()=>Promise.resolve({default:component}))];
    for(const type of types)values.push(type,React.createElement(type));
  }
  for(const tag of tags) for(const type of [...tags,'div',null,0,false,{},{$$typeof:tag}])values.push({$$typeof:tag,type});
  for(const tag of tags) for(const inner of tags)values.push({$$typeof:tag,type:{$$typeof:inner}});
  for(const tag of tags)values.push(Object.create({$$typeof:tag}),Object.freeze({$$typeof:ours.Element,type:tag}),{getModuleId:tag});
  values.push(require('node:vm').runInNewContext('({$$typeof:Symbol.for("react.transitional.element"),type:"section"})'));
  for(const name of Object.keys(upstream)) {
    if(typeof upstream[name]!=='function'){assert.equal(ours[name],upstream[name]);continue;}
    for(const value of values)assert.equal(ours[name](value),upstream[name](value),name);
  }
  assert.equal(ours.isValidElementType(Symbol.for('react.view_transition')),true);
});
test('classification captures a discriminator once and simple predicates avoid unrelated getters',()=>{
  for(const api of [upstream,ours]) {
    let reads=0;const type={get $$typeof(){reads++;return api.ForwardRef;}};
    assert.equal(api.isValidElementType(type),true);assert.equal(reads,api===ours?1:5);
    const element={$$typeof:api.Element,type:{get $$typeof(){throw new Error('unrelated');}}};
    if(api===ours){assert.equal(api.isFragment(element),false);assert.equal(api.isPortal(element),false);}
    else {assert.throws(()=>api.isFragment(element),/unrelated/);assert.throws(()=>api.isPortal(element),/unrelated/);}
    assert.throws(()=>api.isElement({get $$typeof(){throw new Error('marker');}}),/marker/);
  }
});
test('CJS and ESM share the API and function identities',async()=>{const esm=await import('../runtime.mjs');assert.equal(esm.default,ours);for(const key of Object.keys(ours))assert.equal(esm[key],ours[key]);});
for(const file of ['run.cjs','callers.cjs'])test('react-is '+file,()=>{
 const result=spawnSync(process.execPath,[path.resolve(__dirname,'../../../scripts/react-is-conformance',file)],{encoding:'utf8',timeout:120000});assert.equal(result.status,0,result.stdout+result.stderr);
});

'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{createRequire}=require('node:module'),{JSDOM}=require('jsdom');
const dom=new JSDOM('<body></body>',{pretendToBeVisual:true,url:'https://test.invalid'});
for(const key of ['window','document','navigator','HTMLElement','Node','MutationObserver'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=require('react'),{render,cleanup}=require('@testing-library/react'),{renderToString}=require('react-dom/server');
const original=process.argv.includes('--upstream'),api=require('./load.cjs')(original?'upstream':'vpm');
function slot(name){const file=require.resolve(name),local=createRequire(file),mod={exports:{}};let calls=0;
 new Function('require','module','exports',fs.readFileSync(file,'utf8'))(name=>name==='@radix-ui/react-compose-refs'?{...api,useComposedRefs(...args){calls++;return api.useComposedRefs(...args)},composeRefs(...args){calls++;return api.composeRefs(...args)}}:local(name),mod,mod.exports);
 return {Slot:mod.exports.Slot,called:()=>calls};
}
try {
  const object=React.createRef(),first=()=>{},second=()=>{};let current;const identities=[];
  function Hook({refValue,label}){current=api.useComposedRefs(object,refValue);identities.push(current);return React.createElement('button',{ref:current},label)}
  const hook=render(React.createElement(Hook,{refValue:first,label:'one'}));const initial=current;
  hook.rerender(React.createElement(Hook,{refValue:first,label:'two'}));assert.equal(current,initial);assert.equal(object.current.textContent,'two');
  hook.rerender(React.createElement(Hook,{refValue:second,label:'three'}));assert.notEqual(current,initial);hook.unmount();assert.equal(object.current,null);
  assert.match(renderToString(React.createElement(Hook,{refValue:first,label:'server'})),/server/);
  for(const name of ['@radix-ui/react-slot','slot-legacy']) {
    const {Slot,called}=slot(name),parent={current:null},events=[];
    const child=node=>{events.push(node?'attach':'null');if(node)return()=>events.push('cleanup')};
    const el=label=>React.createElement(React.StrictMode,null,React.createElement(Slot,{ref:parent,'data-slot':'yes'},React.createElement('button',{ref:child},label)));
    const view=render(el('first'));assert.equal(parent.current,view.getByRole('button'));assert.equal(parent.current.dataset.slot,'yes');
    assert.deepEqual(events,['attach','cleanup','attach']);
    const afterUpdate=name==='slot-legacy'?['attach','cleanup','attach','cleanup','attach']:['attach','cleanup','attach'];
    view.rerender(el('second'));assert.deepEqual(events,afterUpdate);assert.equal(parent.current.textContent,'second');
    view.unmount();assert.equal(parent.current,null);assert.deepEqual(events,[...afterUpdate,'cleanup']);assert(called()>0);cleanup();
  }
  console.log(`${original?'Original':'VPM'}: stable hook identity, changed refs, SSR and unchanged Slot 1.5.0/1.2.3 StrictMode mount/update/cleanup pass.`);
}finally{cleanup();dom.window.close()}

'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{JSDOM}=require('jsdom');
const dom=new JSDOM('<body></body>');
for(const name of ['window','document','navigator','HTMLElement','Node','CustomEvent'])Object.defineProperty(globalThis,name,{value:dom.window[name],configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=require('react'),{render,cleanup,fireEvent}=require('@testing-library/react'),variant=process.argv[2],mod={exports:{}};
new Function('require','module','exports',fs.readFileSync(path.resolve(__dirname,'../../packages/vradix-react-use-callback-ref/index.cjs'),'utf8'))(require,mod,mod.exports);
const api=variant==='vpm'?mod.exports:require('@radix-ui/react-use-callback-ref'),cache=new Map();let intercepted=0;
function evaluate(file){if(cache.has(file))return cache.get(file).exports;const mod={exports:{}};cache.set(file,mod);const local=createRequire(file);new Function('require','module','exports',fs.readFileSync(file,'utf8'))(name=>{if(name==='@radix-ui/react-use-callback-ref'){intercepted++;return api}const resolved=local.resolve(name);return resolved.includes('/@radix-ui/')&&resolved.endsWith('.js')?evaluate(resolved):local(name)},mod,mod.exports);return mod.exports;}
try{
 const group=evaluate(require.resolve('@radix-ui/react-roving-focus')),events=[];
 const tree=value=>React.createElement(group.Root,{'data-testid':'group',onEntryFocus:event=>{events.push(value);event.preventDefault();}},React.createElement(group.Item,{asChild:true,focusable:true},React.createElement('button',null,'Item')));
 const view=render(tree(1));fireEvent.focus(view.getByTestId('group'));assert.deepEqual(events,[1]);
 view.rerender(tree(2));fireEvent.focus(view.getByTestId('group'));assert.deepEqual(events,[1,2]);assert(intercepted>0);view.unmount();
 console.log(variant+': unchanged RovingFocus caller sees updated entry handler');
}finally{cleanup();dom.window.close();}

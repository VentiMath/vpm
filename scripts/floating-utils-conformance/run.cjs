'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {JSDOM}=require('jsdom'), env=new JSDOM('<!doctype html><html><body></body></html>');
for(const name of ['window','document','Node','Element','HTMLElement','ShadowRoot'])globalThis[name]=name==='window'?env.window:env.window[name];
const api=require('../../packages/vfloating-ui-utils'),dom=require('../../packages/vfloating-ui-utils/dom.cjs');
let count=0;
globalThis.describe=(_name,fn)=>fn();globalThis.test=(_name,fn)=>{fn();count++;};
globalThis.expect=value=>({toEqual:expected=>assert.deepEqual(value,expected),not:{toBeNull:()=>assert.notEqual(value,null)}});
try {
 for(const [file,hash]of Object.entries(require('./upstream/provenance.json').files))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname,'upstream',file))).digest('hex'),hash);
 for(const file of ['getOppositeAxisPlacements.test.ts','getOverflowAncestors.test.ts']) {
  const original=fs.readFileSync(path.join(__dirname,'upstream',file),'utf8');
  const executable=original.replace(/^import \{(\w+)\} from '\.\.\/src(\/dom)?';/m,'const {$1} = api;');
  assert.notEqual(executable,original);
  new Function('api',executable)(file.includes('Overflow')?dom:api);
 }
 console.log(`${count} unchanged Floating UI 0.2.12 tests pass (import redirection only).`);
} finally {env.window.close();}

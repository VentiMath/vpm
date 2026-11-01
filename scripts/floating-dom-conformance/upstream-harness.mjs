import {platform, autoUpdate} from '@floating-ui/dom';
export {platform, autoUpdate};
export const getClientRects = platform.getClientRects;
const cases=[],before=[],after=[];
export const beforeEach=fn=>before.push(fn),afterEach=fn=>after.push(fn);
export const test=(name,fn)=>cases.push([name,fn,before.slice(),after.slice()]);
test.runIf=enabled=>enabled?test:()=>{};
export const expect=actual=>({
  toBe(expected){if(actual!==expected)throw Error('identity assertion failed');},
  toEqual(expected){if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('equality assertion failed');},
  toHaveBeenCalledTimes(expected){if(actual.calls!==expected)throw Error(`expected ${expected} calls, got ${actual.calls}`);},
});
export const vi={fn(){const fn=()=>{fn.calls++;};fn.calls=0;fn.mockClear=()=>{fn.calls=0;};return fn;}};
export async function runRetained(){
  globalThis.test=test;globalThis.expect=expect;
  await import('retained:autoUpdate.test.ts.txt');
  before.length=after.length=0;
  await import('retained:getClientRects.test.ts.txt');
  await import('retained:getOffsetParent.test.ts.txt');
  for(const [name,fn,setup,teardown]of cases){try{for(const f of setup)await f();await fn();}catch(error){throw Error(name+': '+error.message);}finally{for(const f of teardown)await f();}}
  return cases.length;
}

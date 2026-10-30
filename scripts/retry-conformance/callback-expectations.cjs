'use strict';
// The retained tests use only callback(), expectAnytime() and verification.
// Preserve exact once-only expectations without the old helper's V8 stack parser.
const assert=require('node:assert/strict'),instances=[];
exports.create=()=>{
 const callbacks=new Map();instances.push(callbacks);
 return {
  callback(name){const state={name,calls:0,expected:0};const fn=()=>{state.calls++;assert.ok(state.calls<=state.expected,name+': unexpected call');};callbacks.set(fn,state);return fn;},
  expectAnytime(fn){const state=callbacks.get(fn);assert.ok(state);state.expected++;},
 };
};
exports._autoVerify=()=>{for(const callbacks of instances)for(const {name,calls,expected}of callbacks.values())assert.equal(calls,expected,name);};

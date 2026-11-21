'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const {current, capabilityFirst} = require('../mobile-gate.cjs');
const desktop = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36';
const phone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1';
const profiles = [
  [{navigator:{userAgent:desktop,maxTouchPoints:0}},()=>false],
  [{navigator:{userAgent:phone,maxTouchPoints:5}},()=>false],
  [{navigator:{userAgent:desktop,maxTouchPoints:0}},()=>true],
  [{navigator:{userAgent:'Opera Mini/7.5',maxTouchPoints:0}},()=>false],
];
const cases = [
  ['one of each profile',[0,1,2,3],3],
  ['two UA fallback profiles',[0,3],1],
].map(([name,ids,expected])=>({
  name,
  make(which) {
    const gate=which==='current'?current:capabilityFirst;
    return ()=>{
      let count=0;
      for (const id of ids) count += Number(gate(profiles[id][0],profiles[id][1]));
      return count;
    };
  },
  validate:result=>assert.equal(result,expected),
}));
require('../../bench-process.cjs').run({root:path.resolve(__dirname,'..'),upstream:'current',vpm:'capabilityFirst',cases,
  files:['mobile-gate.cjs','mobile-bench/compare.cjs','package-lock.json']
}).catch(e=>{console.error(e);process.exitCode=1;});

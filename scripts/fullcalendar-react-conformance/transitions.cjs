'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {runVitest}=require('./vitest-run.cjs');
for(const upstream of [true,false]) {
 const files={'instants.test.tsx':path.join(__dirname,'instants.test.tsx.txt')};
 if(!upstream)files['transitions.test.tsx']=path.join(__dirname,'transitions.test.tsx.txt');
 const stats=runVitest({upstream,env:{TZ:'America/Los_Angeles'},files});
 for(const file of stats.testResults)for(const test of file.assertionResults)if(test.status==='failed')console.error(test.fullName,test.failureMessages);
 assert.equal(stats.numTotalTests,upstream?7:17);assert.equal(stats.numFailedTests,0);
}
console.log('Calendar date regressions: 7 exact-instant controls pass upstream/VPM in Pacific and named zones; 9 mounted cross-row drag/duration/revert cases and zero-movement preservation pass VPM.');

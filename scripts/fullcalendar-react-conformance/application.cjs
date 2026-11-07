'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {runVitest}=require('./vitest-run.cjs');
for(const upstream of [true,false]) {
 const stats=runVitest({upstream,env:{UPSTREAM_CONTROL:upstream?'1':'0'},files:{'application.test.tsx':path.join(__dirname,'application.test.tsx.txt'),'identity.test.tsx':path.join(__dirname,'identity.test.tsx.txt')}});
 assert.equal(stats.numTotalTests,6);
 assert.equal(stats.numFailedTests,0,JSON.stringify(stats.testResults.map(r=>r.assertionResults.map(a=>a.failureMessages))).slice(0,5000));
}
console.log('FullCalendar app-shaped callers: navigation, 3 views, custom content, clicks, selection, edit payloads, filtering, stable event identity, label-state loop prevention and unmount pass upstream/VPM; v6 updateSize is absent in both v7 APIs; omitted allDay regression reproduced upstream and fixed here.');

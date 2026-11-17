'use strict';
const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),base=require('./build.cjs');
const run=kind=>JSON.parse(execFileSync(process.execPath,[base+'/'+kind+'.cjs'],{encoding:'utf8',env:process.env}));
const own=run('own'),up=run('upstream');assert.deepEqual(own,up);console.log('Unchanged Redoc 2.5.0: identical complete SSR output, '+own.calls+' verified classnames calls');

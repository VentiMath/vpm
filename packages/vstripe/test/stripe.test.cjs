'use strict';
const {test}=require('node:test'),{execFileSync}=require('node:child_process'),path=require('node:path');
for(const variant of ['vpm','upstream','app'])test(`${variant} Checkout and webhook contracts`,()=>{
 execFileSync(process.execPath,[path.resolve(__dirname,'../../../scripts/stripe-conformance/run.cjs'),variant],{stdio:'pipe',timeout:20000});
});

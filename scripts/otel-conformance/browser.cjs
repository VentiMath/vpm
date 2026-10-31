'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'votel-browser-'));
try {
 for(const [name,entry]of [['upstream',path.join(path.dirname(require.resolve('api-current')),'index.mjs')],['vpm',path.resolve(__dirname,'../../packages/vopentelemetry-api/dist/index.mjs')]]) {
  fs.writeFileSync(path.join(temp,'entry.mjs'),`import * as api from ${JSON.stringify(entry)};const key=api.createContextKey('browser');const ctx=api.ROOT_CONTEXT.setValue(key,42);if(ctx.getValue(key)!==42)throw Error('context');const b=api.propagation.createBaggage({key:{value:'ok'}});if(b.getEntry('key').value!=='ok')throw Error('baggage');if(api.createTraceState('a=1,b=2').serialize()!=='a=1,b=2')throw Error('state');if(api.trace.getTracer('browser').startSpan('call').isRecording())throw Error('noop');api.metrics.getMeter('browser').createCounter('n').add(1);api.logs.getLogger('browser').emit({body:'ok'});globalThis.checked=true;`);
  const out=path.join(temp,'out.js'),run=spawnSync('bun',['build',path.join(temp,'entry.mjs'),'--target=browser','--format=iife','--minify','--outfile='+out],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);const context={};vm.runInNewContext(fs.readFileSync(out,'utf8'),context);assert.equal(context.checked,true);console.log(name+': browser-targeted ESM bundle passed without Node globals ('+fs.statSync(out).size+' bytes).');
 }
}finally{fs.rmSync(temp,{recursive:true,force:true});}

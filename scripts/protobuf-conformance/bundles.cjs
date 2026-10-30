'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),{spawnSync}=require('node:child_process');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vprotobuf-browser-'));
try{for(const entry of ['index','light','minimal']){
 const source=`import pb from ${JSON.stringify(path.resolve(__dirname,'../../packages/vprotobufjs/'+entry+'.js'))};const bytes=pb.Writer.create().int64('9007199254740993').string('é漢😀').finish();const r=pb.Reader.create(bytes);globalThis.result=[pb.build,pb.util.isNode,r.int64().toString(),r.string(),Object.isFrozen(pb.util.LongBits.zero)];${entry==='minimal'?'':`const T=pb.Root.fromJSON({nested:{Item:{fields:{n:{type:'int64',id:1},text:{type:'string',id:2}}}}}).lookupType('Item');globalThis.message=T.toObject(T.decode(T.encode(T.fromObject({n:'9007199254740993',text:'é漢😀'})).finish()),{longs:String});`}${entry==='index'?`globalThis.parsed=pb.parse('syntax="proto3"; message T{int32 n=1;}').root.lookupType('T').decode(new Uint8Array([8,7])).n;`:''}`;
 fs.writeFileSync(path.join(temp,'entry.mjs'),source);const out=path.join(temp,'bundle.js'),built=spawnSync('bun',['build',path.join(temp,'entry.mjs'),'--target=browser','--format=iife','--minify','--outfile='+out],{encoding:'utf8'});assert.equal(built.status,0,built.stderr);
 const context={TextEncoder,TextDecoder,Uint8Array};vm.runInNewContext(fs.readFileSync(out,'utf8'),context,{timeout:5000});assert.deepEqual(Array.from(context.result),[entry==='index'?'full':entry,false,'9007199254740993','é漢😀',true]);
 if(entry!=='minimal')assert.deepEqual(JSON.parse(JSON.stringify(context.message)),{n:'9007199254740993',text:'é漢😀'});if(entry==='index')assert.equal(context.parsed,7);
 console.log(entry+': browser bundle executes without Node globals; '+fs.statSync(out).size+' bytes.');
}}finally{fs.rmSync(temp,{recursive:true,force:true});}

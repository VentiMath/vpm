'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),vm=require('node:vm'),{spawnSync}=require('node:child_process');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vprotojson-browser-'));
try{
 const source=`import pb from ${JSON.stringify(path.resolve(__dirname,'../../packages/vprotobufjs/index.js'))};import s from ${JSON.stringify(path.resolve(__dirname,'../../packages/vproto3-json-serializer/index.js'))};const root=pb.Root.fromJSON(pb.common['google/protobuf/timestamp.proto']);const T=root.lookupType('google.protobuf.Timestamp');if(s.toProto3JSON(s.fromProto3JSON(T,'2026-10-30T14:30:00.123+02:00'))!=='2026-10-30T12:30:00.123Z')throw Error('timestamp');const B=pb.parse('message B{optional bytes data=1;}').root.lookupType('B');if(s.toProto3JSON(B.create({data:new Uint8Array([99,1,2,88]).subarray(1,3)})).data!=='AQI=')throw Error('bytes');globalThis.checked=true;`;
 fs.writeFileSync(path.join(temp,'entry.mjs'),source);const r=spawnSync('bun',['build',path.join(temp,'entry.mjs'),'--target=browser','--format=iife','--minify','--outfile='+path.join(temp,'out.js')],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
 const context={Uint8Array,TextEncoder,TextDecoder};vm.runInNewContext(fs.readFileSync(path.join(temp,'out.js'),'utf8'),context);assert.equal(context.checked,true);console.log('Browser bundle: exact byte slices and offset timestamps passed without Node globals.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}

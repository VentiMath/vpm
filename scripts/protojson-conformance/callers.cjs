'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {consumer,from}=require('./consumers.cjs');
function setup(variant='vpm',legacy=false){
 const c=consumer(variant,legacy),{GrpcClient}=c.gax('fallback.js');GrpcClient.clearProtoCache();const client=new GrpcClient({auth:{}}),root=client.loadProtoJSON(structuredClone(c.firestoreSchema()));root.resolveAll();
 return {...c,root,methods:root.lookupService('google.firestore.v1.Firestore').methods,rest:c.gax('fallbackRest.js')};
}
const documentName='projects/test/databases/(default)/documents/items/one';
const document={name:documentName,fields:{count:{integerValue:'9007199254740993'},title:{stringValue:'é漢😀'},blob:{bytesValue:'AP+A'},active:{booleanValue:true},nothing:{nullValue:null},list:{arrayValue:{values:[{integerValue:'-9223372036854775808'},{stringValue:'nested'}]}}},createTime:'2026-10-30T12:34:56.123456789Z',updateTime:'2026-10-30T12:35:00.001Z'};
async function run(variant='vpm',legacy=false){
 const files=['fallbackRest.js','googleError.js','resumableUpload.js'].map(f=>path.join(path.dirname(from.resolve('google-gax')),f));const hashes=()=>files.map(f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex')),before=hashes();
 const selected=setup(variant,legacy),control=setup('upstream'),bytes=Buffer.from(JSON.stringify(document));let checks=0;
 for(const c of [selected,control]) {
  const decoded=c.rest.decodeResponse(c.methods.GetDocument,true,bytes);assert.equal(decoded.fields.count.integerValue,'9007199254740993');assert.deepEqual([...decoded.fields.blob.bytesValue],[0,255,128]);assert.equal(decoded.createTime.nanos,123456789);checks++;
 }
 for(const [method,request]of [
  ['GetDocument',{name:documentName,mask:{fieldPaths:['title','count']}}],
  ['BatchGetDocuments',{database:'projects/test/databases/(default)',documents:[documentName],transaction:Buffer.from([1,2])}],
  ['CreateDocument',{parent:'projects/test/databases/(default)/documents/parents/one',collectionId:'children',documentId:'new',document:{fields:{count:{integerValue:'9007199254740993'}}}}],
 ])for(const numericEnums of [false,true]){
  const args=['https','firestore.example',443,request,numericEnums,true];const actual=selected.rest.encodeRequest(selected.methods[method],...args),expected=control.rest.encodeRequest(control.methods[method],...args);assert.deepEqual(actual,expected);checks++;
 }
 // Actual gax error decoder: Any status details must retain type URLs and payloads.
 for(const c of [selected,control]) {
  const {GoogleErrorDecoder}=c.gax('googleError.js'),decoder=new GoogleErrorDecoder(),status=decoder.decodeHTTPError({code:3,message:'invalid',details:[{'@type':'type.googleapis.com/google.rpc.BadRequest',fieldViolations:[{field:'name',description:'required'}]}]});
  assert.equal(status.code,3);assert.equal(status.details[0].type_url,'type.googleapis.com/google.rpc.BadRequest');const detail=decoder.decodeProtobufAny(status.details[0]);assert.equal(detail.fieldViolations[0].description,'required');checks++;
 }
 // Drive the real resumable-start method; replace only the outbound transport.
 async function start(c){const {ResumableUploadSession}=c.gax('resumableUpload.js'),s=Object.create(ResumableUploadSession.prototype);s.context={rpc:c.methods.BatchGetDocuments,request:{database:'projects/test/databases/(default)',documents:[documentName]},numericEnums:true,minifyJson:true,protocol:'https',servicePath:'firestore.example',servicePort:443};let sent;
  s.sendCommandWithRetry=async(...args)=>{sent=args;return {headers:new Headers({'x-goog-upload-url':'https://upload.example/session','x-goog-upload-status':'active'})};};
  const result=await s.sendStart();assert.equal(result.uploadUrl,'https://upload.example/session');return sent;
 }
 assert.deepEqual(await start(selected),await start(control));checks++;
 // Corrected timestamp path runs through the actual response decoder.
 const offset={...document,createTime:'2026-10-30T14:34:56.123+02:00'};
 const converted=selected.rest.decodeResponse(selected.methods.GetDocument,true,Buffer.from(JSON.stringify(offset)));
 if(variant==='vpm')assert.equal(converted.createTime.nanos,123000000);else assert.equal(converted.createTime.nanos,123);checks++;
 assert.equal(checks,12);assert(selected.stats.toProto3JSON>=7);assert(selected.stats.fromProto3JSON>=3);assert.deepEqual(hashes(),before);
 console.log(`${variant}${legacy?' / protobuf 7':''}: ${checks} real gax/Firestore schema paths including stock controls; requests, responses, status details and resumable-start serialization. ${JSON.stringify(selected.stats)}`);return checks;
}
module.exports=run;module.exports.setup=setup;module.exports.document=document;
if(require.main===module)run(process.argv.includes('--upstream')?'upstream':'vpm',process.argv.includes('--legacy')).catch(e=>{console.error(e);process.exitCode=1;});

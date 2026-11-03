'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{Duplex}=require('node:stream');
const F=require('../../packages/vgoogle-cloud-firestore'),proto=require('./node_modules/@google-cloud/firestore').protos.google.firestore.v1;
const directory=path.join(__dirname,'upstream/conformance/conformance-tests');
function normalize(value){if(!value||typeof value!=='object')return value;for(const key of Object.keys(value)){if(['updateTime','createTime','readTime'].includes(key)&&typeof value[key]==='string')value[key]=F.Timestamp.fromProto(value[key]).toProto();else normalize(value[key]);}return value;}
const doc=value=>proto.Document.toObject(proto.Document.fromObject(value),{longs:String,enums:String,bytes:String,defaults:true});
async function run(){let checked=0;const failures=[];for(const file of fs.readdirSync(directory).sort())for(const test of JSON.parse(fs.readFileSync(path.join(directory,file))).tests){if(!test.listen)continue;const spec=normalize(test.listen),db=new F.Firestore({projectId:'projectID'}),snapshots=[],errors=[];let complete,stream;const finished=new Promise(resolve=>complete=resolve);
 db._getClient=async()=>({listen(){stream=new Duplex({objectMode:true,read(){},write(_request,_enc,done){done();queueMicrotask(()=>{for(const response of spec.responses)if(!stream.destroyed)stream.push(proto.ListenResponse.fromObject(response));setImmediate(complete);});}});stream.cancel=()=>stream.destroy();return stream;}});
 const stop=db.collection('C').orderBy('a').onSnapshot(snapshot=>snapshots.push({docs:snapshot.docs.map(s=>doc(s._proto)),changes:snapshot.docChanges().map(c=>({kind:c.type.toUpperCase(),doc:doc(c.doc._proto),oldIndex:c.oldIndex,newIndex:c.newIndex})),readTime:snapshot.readTime.toProto()}),error=>{errors.push(error.code||error.message);complete();});
 await finished;stop();await db.terminate();
 try{if(spec.isError){assert(errors.length);checked++;continue;}assert.deepEqual(errors,[]);assert.deepEqual(snapshots,spec.snapshots.map(s=>({docs:(s.docs||[]).map(doc),changes:(s.changes||[]).map(c=>({kind:c.kind,doc:doc(c.doc),oldIndex:c.oldIndex??0,newIndex:c.newIndex??0})),readTime:F.Timestamp.fromProto(s.readTime).toProto()})));checked++;}catch(error){failures.push({file,error:error.message});}
 }console.log(JSON.stringify({checked,failures},null,2));assert.equal(failures.length,0);}
run().catch(error=>{console.error(error);process.exitCode=1});

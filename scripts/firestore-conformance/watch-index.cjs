'use strict';
// Exercise the actual SDK and local gRPC Listen transport. Snapshot docs are not
// materialized until after subsequent updates and a reset have completed.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const from=require('node:module').createRequire(path.join(__dirname,'package.json'));
const upstream=process.argv.includes('--upstream');
const sdk=upstream?from('@google-cloud/firestore'):require('../../packages/vgoogle-cloud-firestore');
const schema=path.resolve(path.dirname(from.resolve('@google-cloud/firestore')),'../protos/v1.json');
const grpc=from('@grpc/grpc-js'),loader=from('@grpc/proto-loader');
const root='projects/index-fixture/databases/(default)/documents/items/';
const doc=(id,n,seconds)=>({name:root+id,fields:{n:{integerValue:String(n)}},createTime:{seconds:'1'},updateTime:{seconds:String(seconds)}});
function messages(targetIds){return [
 {targetChange:{targetChangeType:'ADD',targetIds}},
 ...[['a',30],['b',10],['c',20],['e',20]].map(([id,n])=>({documentChange:{document:doc(id,n,2),targetIds}})),
 {targetChange:{targetChangeType:'CURRENT',targetIds,resumeToken:Buffer.from('r1')}},
 {targetChange:{targetChangeType:'NO_CHANGE',targetIds:[],readTime:{seconds:'3'}}},
 {documentChange:{document:doc('b',40,4),targetIds}},
 {documentChange:{document:doc('d',5,4),targetIds}},
 {documentDelete:{document:root+'c',readTime:{seconds:'4'},removedTargetIds:targetIds}},
 {targetChange:{targetChangeType:'NO_CHANGE',targetIds:[],readTime:{seconds:'5'}}},
 {targetChange:{targetChangeType:'RESET',targetIds}},
 {documentChange:{document:doc('e',20,6),targetIds}},
 {targetChange:{targetChangeType:'CURRENT',targetIds,resumeToken:Buffer.from('r2')}},
 {targetChange:{targetChangeType:'NO_CHANGE',targetIds:[],readTime:{seconds:'7'}}},
]}
async function main(){
 const definition=loader.fromJSON(JSON.parse(fs.readFileSync(schema)),{longs:String,defaults:false})['google.firestore.v1.Firestore'];
 const server=new grpc.Server();server.addService(definition,{listen(call){call.once('data',request=>{for(const message of messages([request.addTarget.targetId]))call.write(message)});call.on('end',()=>call.end())}});
 const port=await new Promise((resolve,reject)=>server.bindAsync('127.0.0.1:0',grpc.ServerCredentials.createInsecure(),(e,p)=>e?reject(e):resolve(p)));
 const previous=process.env.FIRESTORE_EMULATOR_HOST;process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:'+port;
 const db=new sdk.Firestore({projectId:'index-fixture'});
 try{
  for(const direction of ['asc','desc']){
   const retained=[];
   await new Promise((resolve,reject)=>{
    let stop;const timeout=setTimeout(()=>{stop?.();reject(Error('Listen fixture timeout'))},10000);
    stop=db.collection('items').orderBy('n',direction).onSnapshot(snapshot=>{retained.push(snapshot);if(retained.length===3){stop();clearTimeout(timeout);resolve()}},error=>{clearTimeout(timeout);reject(error)});
   });
   const ascending=[['b','c','e','a'],['d','e','a','b'],['e']];let current=[];
   for(let i=0;i<3;i++){
    const snapshot=retained[i],want=direction==='asc'?ascending[i]:ascending[i].toReversed();
    assert.deepEqual(snapshot.docs.map(d=>d.id),want);
    for(const c of snapshot.docChanges()){
     if(c.type!=='added'){assert.equal(current[c.oldIndex],c.doc.id);current.splice(c.oldIndex,1)}else assert.equal(c.oldIndex,-1);
     if(c.type!=='removed')current.splice(c.newIndex,0,c.doc.id);else assert.equal(c.newIndex,-1);
    }
    assert.deepEqual(current,want);
   }
   assert.deepEqual(retained[0].docs.map(d=>[d.id,d.get('n')]),(direction==='asc'?[['b',10],['c',20],['e',20],['a',30]]:[['a',30],['e',20],['c',20],['b',10]]));
  }
  if(!upstream){assert(Object.keys(require.cache).some(file=>file.endsWith('/snapshot-index.js')));assert(!Object.keys(require.cache).some(file=>/\/v?functional-red-black-tree\//.test(file)),'VPM Watch must not load either general tree')}
  console.log(`${upstream?'Original':'VPM'} Firestore9.4: ascending/descending Listen, equal-value path ties, add/reorder/delete indexes, reset and lazily retained snapshots pass.`);
 }finally{await db.terminate().catch(()=>{});server.forceShutdown();if(previous===undefined)delete process.env.FIRESTORE_EMULATOR_HOST;else process.env.FIRESTORE_EMULATOR_HOST=previous}
}
main().catch(error=>{console.error(error);process.exitCode=1});

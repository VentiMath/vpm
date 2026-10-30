'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {Readable}=require('node:stream'),{createRequire}=require('node:module');
const storagePackage=require.resolve('../retry-request-conformance/node_modules/@google-cloud/storage/package.json');
const fixture=createRequire(storagePackage);
async function checkQueueCaller(){
 const limitEntry=fixture.resolve('p-limit'),fromLimit=createRequire(limitEntry),queueEntry=fromLimit.resolve('yocto-queue');
 assert.equal(fromLimit('yocto-queue/package.json').version,'0.1.0');
 require(limitEntry);require(queueEntry);const savedLimit=require.cache[limitEntry],savedQueue=require.cache[queueEntry].exports;
 const deadline=setTimeout(()=>{throw Error('Queue caller check timed out');},10000);
 try{
  require.cache[queueEntry].exports=require('../../packages/vyocto-queue');delete require.cache[limitEntry];
  const limit=require(limitEntry)(3);let active=0,peak=0;
  const results=await Promise.all(Array.from({length:24},(_,i)=>limit(async()=>{peak=Math.max(peak,++active);await new Promise(r=>setImmediate(r));active--;return i;})));
  assert.deepEqual(results,Array.from({length:24},(_,i)=>i));assert.equal(peak,3);assert.equal(limit.pendingCount,0);assert.equal(limit.activeCount,0);
  console.log('p-limit 3.1.0 queue caller: 24 tasks passed with vyocto-queue replacing 0.1.0.');
 }finally{clearTimeout(deadline);require.cache[limitEntry]=savedLimit;require.cache[queueEntry].exports=savedQueue;}
}
module.exports=async function checkCallers(lib=require('../../packages/vp-limit')){
 await checkQueueCaller();
 assert.equal(require(storagePackage).version,'8.4.0');assert.equal(fixture('p-limit/package.json').version,'3.1.0');
 const entry=fixture.resolve('p-limit'),previous=require(entry),prefix=path.dirname(storagePackage)+path.sep;
 const saved=new Map(Object.entries(require.cache).filter(([file])=>file.startsWith(prefix)));
 for(const [file]of saved)delete require.cache[file];
 let created=0,submitted=0;
 require.cache[entry].exports=(...args)=>{created++;const limit=lib(...args);return (...args)=>{submitted++;return limit(...args);};};
 const deadline=setTimeout(()=>{throw Error('Storage limiter caller check timed out');},10000);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-storage-limit-'));
 try{
  const {Storage,TransferManager}=fixture('@google-cloud/storage');const bucket=new Storage({projectId:'vpm-test'}).bucket('test');
  const stats={active:0,peak:0,completed:0};
  async function work(value){stats.peak=Math.max(stats.peak,++stats.active);await new Promise(r=>setImmediate(r));stats.active--;stats.completed++;return value;}
  function reset(){stats.peak=stats.completed=0;assert.equal(stats.active,0);}
  const files=Array.from({length:25},(_,i)=>({name:'file-'+i,delete:()=>work(i),makePublic:()=>work(i),makePrivate:()=>work(i)}));
  bucket.getFilesStream=()=>Readable.from(files);await bucket.deleteFiles();assert.equal(stats.completed,25);assert.equal(stats.peak,10);reset();
  const failure=Error('delete denied');files[4].delete=async()=>{await work(4);throw failure;};
  await assert.rejects(bucket.deleteFiles({force:true}),errors=>errors.length===1&&errors[0]===failure);assert.equal(stats.completed,25);assert.equal(stats.peak,10);reset();
  bucket.getFiles=async()=>[files];
  await new Promise((resolve,reject)=>bucket.makeAllFilesPublicPrivate_({public:true},(e,updated)=>{try{assert.ifError(e);assert.equal(updated.length,25);resolve();}catch(e){reject(e);}}));assert.equal(stats.completed,25);assert.ok(stats.peak<=10);reset();
  await new Promise((resolve,reject)=>bucket.makeAllFilesPublicPrivate_({public:false},e=>e?reject(e):resolve()));assert.equal(stats.completed,25);assert.ok(stats.peak<=10);reset();
  const manager=new TransferManager(bucket),paths=Array.from({length:12},(_,i)=>path.join(tmp,'upload-'+i));
  for(const file of paths)fs.writeFileSync(file,'test');
  let open;const barrier=new Promise(r=>open=r);const firstBatch=new Promise(resolve=>{
   bucket.upload=async(file,opts)=>{assert.ok(opts.destination.endsWith(path.basename(file)));stats.peak=Math.max(stats.peak,++stats.active);if(stats.active===3)resolve();await barrier;stats.active--;stats.completed++;return [file];};
  });
  const upload=manager.uploadManyFiles(paths,{concurrencyLimit:3});await firstBatch;assert.equal(stats.peak,3);open();assert.deepEqual(await upload,paths.map(p=>[p]));assert.equal(stats.completed,12);assert.ok(stats.peak<=3);reset();
  const downloads=Array.from({length:13},(_,i)=>({name:'download-'+i,download:opts=>{assert.equal(opts.destination,path.join(tmp,'download-'+i));return work([Buffer.from(String(i))]);}}));
  const results=await manager.downloadManyFiles(downloads,{concurrencyLimit:3,passthroughOptions:{destination:tmp}});
  assert.deepEqual(results.map(x=>x[0].toString()),Array.from({length:13},(_,i)=>String(i)));assert.equal(stats.completed,13);assert.ok(stats.peak<=3);
  assert.equal(created,6);assert.equal(submitted,125);
  console.log(`Storage 8.4.0: ${created} limiters and ${submitted} tasks through delete, forced errors, public/private ACLs, upload and download batches passed.`);
 }finally{
  clearTimeout(deadline);
  require.cache[entry].exports=previous;
  for(const file of Object.keys(require.cache))if(file.startsWith(prefix))delete require.cache[file];for(const [file,module]of saved)require.cache[file]=module;
  fs.rmSync(tmp,{recursive:true,force:true});
 }
};
if(require.main===module)module.exports(process.argv.includes('--upstream')?fixture('p-limit'):process.argv.includes('--latest')?require('p-limit').default:undefined).catch(error=>{console.error(error);process.exitCode=1;});

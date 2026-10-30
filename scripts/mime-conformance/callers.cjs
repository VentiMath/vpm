'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{createRequire}=require('node:module'),{Writable}=require('node:stream'),{finished}=require('node:stream/promises'),{gunzipSync}=require('node:zlib');
module.exports=async function callers(mode='vpm'){
 const target=mode==='legacy'?require('./node_modules/mime-legacy'):mode==='upstream'?(await import('./node_modules/mime/dist/src/index.js')).default:require('../../packages/vmime');
 const storagePackage=require.resolve('../retry-request-conformance/node_modules/@google-cloud/storage/package.json'),fixture=createRequire(storagePackage),entry=fixture.resolve('mime');
 assert.equal(require(storagePackage).version,'8.4.0');const original=require(entry),prefix=path.dirname(storagePackage)+path.sep,saved=new Map(Object.entries(require.cache).filter(([file])=>file.startsWith(prefix)));
 const calls=[];
 try{
  for(const[file]of saved)delete require.cache[file];
  require.cache[entry].exports={getType(name){calls.push(name);return target.getType(name);}};
  const {Storage}=fixture('@google-cloud/storage'),storage=new Storage({projectId:'mime-fixture',retryOptions:{autoRetry:false}}),bucket=storage.bucket('fixture');
  let uploads=0,composes=0;
  const cases=[['reports/summary.JSON','application/json'],['images/PHOTO.JPG','image/jpeg'],['scripts/app.js',mode==='legacy'?'application/javascript':'text/javascript'],['windows\\notes.TXT','text/plain'],['no-extension',undefined],['folder/.json',undefined],['x.bogus',undefined]];
  for(const [name,expected]of [...cases,['explicit.txt','custom/type']]){
   const explicit=name==='explicit.txt',file=bucket.file(name),options={resumable:false,validation:false,gzip:'auto',metadata:explicit?{contentType:'custom/type'}:{}};
   const before=calls.length;
   file.startSimpleUpload_=(stream,opts)=>{
    uploads++;assert.equal(opts.metadata.contentType,expected,name);
    const chunks=[];stream.setWritable(new Writable({write(chunk,encoding,done){chunks.push(chunk);done();},final(done){const bytes=Buffer.concat(chunks);assert.equal((opts.metadata.contentEncoding==='gzip'?gunzipSync(bytes):bytes).toString(),'payload');stream.emit('metadata');done();}}));stream.setReadable(null);
   };
   const output=file.createWriteStream(options);output.end('payload');await finished(output);
   assert.equal(calls.length-before,explicit?0:1,name);
   const destination=bucket.file(name);if(explicit)destination.metadata.contentType='custom/type';
   destination.request=(opts,done)=>{composes++;assert.equal(opts.method,'POST');assert.equal(opts.uri,'/compose');assert.equal(opts.json.destination.contentType,expected,name);assert.deepEqual(opts.json.sourceObjects,[{name:'part-one'},{name:'part-two'}]);done(null,{name});};
   await bucket.combine(['part-one','part-two'],destination);
   assert.equal(calls.length-before,explicit?0:2,name);
  }
  assert.equal(uploads,8);assert.equal(composes,8);assert.equal(calls.length,14);
  console.log(`${mode} mime Storage 8.4.0 callers: 8 uploads, 8 composes, 14 lookups; payload/gzip, metadata override, case/path and mime 3→4 JavaScript migration verified.`);
 }finally{require.cache[entry].exports=original;for(const file of Object.keys(require.cache))if(file.startsWith(prefix))delete require.cache[file];for(const[file,module]of saved)require.cache[file]=module;}
};
if(require.main===module)module.exports(process.argv.includes('--upstream')?'upstream':process.argv.includes('--legacy')?'legacy':'vpm').catch(e=>{console.error(e);process.exitCode=1;});

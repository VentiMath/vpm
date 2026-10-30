'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{createRequire}=require('node:module'),{PassThrough}=require('node:stream');
const storagePackage=require.resolve('../retry-request-conformance/node_modules/@google-cloud/storage/package.json'),fixture=createRequire(storagePackage);
module.exports=async function checkCallers(promiseLib=require('../../packages/vpromisify'),projectLib=require('../../packages/vprojectify')){
 assert.equal(require(storagePackage).version,'8.4.0');
 for(const name of ['promisify','projectify'])assert.equal(fixture('@google-cloud/'+name+'/package.json').version,'6.2.1');
 const entries=['promisify','projectify'].map(name=>fixture.resolve('@google-cloud/'+name)),previous=entries.map(entry=>require(entry));
 const prefix=path.dirname(storagePackage)+path.sep,saved=new Map(Object.entries(require.cache).filter(([file])=>file.startsWith(prefix)));
 for(const [file]of saved)delete require.cache[file];
 let wrappedCalls=0,projectCalls=0;const original=promiseLib.promisify;
 promiseLib.promisify=function(...args){const fn=original(...args);return new Proxy(fn,{apply(target,receiver,args){wrappedCalls++;return Reflect.apply(target,receiver,args);}});};
 require.cache[entries[0]].exports=promiseLib;
 require.cache[entries[1]].exports={...projectLib,replaceProjectIdToken(...args){projectCalls++;return projectLib.replaceProjectIdToken(...args);}};
 try{
  const {Storage}=fixture('@google-cloud/storage'),storage=new Storage({projectId:'vpm-project'}),bucket=storage.bucket('bucket'),file=bucket.file('file');
  const {util}=require(path.join(prefix,'build/cjs/src/nodejs-common/util.js'));
  let requests=0,error;
  storage.request=(opts,cb)=>{requests++;setImmediate(()=>cb(error,{id:opts.uri,name:'file',custom:'metadata'},{statusCode:200,marker:'response'}));};
  for(const resource of [bucket,file]){
   const [metadata,response]=await resource.getMetadata();assert.equal(metadata.custom,'metadata');assert.equal(response.marker,'response');assert.equal(resource.metadata,metadata);
   await new Promise((resolve,reject)=>resource.getMetadata((e,m,r)=>{try{assert.ifError(e);assert.equal(m.custom,'metadata');assert.equal(r.marker,'response');resolve();}catch(e){reject(e);}}));
   assert.deepEqual(await resource.exists(),[true]);
   error=Object.assign(Error('missing'),{code:404});assert.deepEqual(await resource.exists(),[false]);
   error=Object.assign(Error('denied'),{code:403});await assert.rejects(resource.getMetadata(),e=>e===error);error=undefined;
  }
  assert.equal(requests,10);assert.equal(wrappedCalls,36,'SDK wrappers must execute');
  const stream=new PassThrough(),buffer=Buffer.from('{{projectId}}');
  const req={uri:'https://example.test/projects/{{projectId}}/items',qs:{project:'{{projectId}}',autoPaginate:true},json:{nested:{project:'{{projectId}}'}},multipart:[{body:'project={{projectId}}'},{body:buffer},{body:stream}]};
  assert.equal(util.decorateRequest(req,'vpm-project'),req);assert.equal(req.uri,'https://example.test/projects/vpm-project/items');assert.deepEqual(req.qs,{project:'vpm-project'});assert.equal(req.json.nested.project,'vpm-project');assert.equal(req.multipart[0].body,'project=vpm-project');assert.equal(req.multipart[1].body,buffer);assert.equal(req.multipart[2].body,stream);assert.equal(req.headers['Content-Type'],'application/json');stream.destroy();
  assert.throws(()=>util.decorateRequest({uri:'https://example.test/{{projectId}}'},undefined),e=>e instanceof projectLib.MissingProjectIdError);
  assert.equal(projectCalls,7);
  console.log(`Storage 8.4.0: ${wrappedCalls} promise/callback wrapper calls, metadata/exists/errors and ${projectCalls} project substitutions through the actual request decorator passed.`);
 }finally{
  promiseLib.promisify=original;entries.forEach((entry,i)=>require.cache[entry].exports=previous[i]);
  for(const file of Object.keys(require.cache))if(file.startsWith(prefix))delete require.cache[file];for(const [file,module]of saved)require.cache[file]=module;
 }
};
if(require.main===module)module.exports(...(process.argv.includes('--upstream')?[fixture('@google-cloud/promisify'),fixture('@google-cloud/projectify')]:[])).catch(error=>{console.error(error);process.exitCode=1;});

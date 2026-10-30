'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{createHash}=require('node:crypto');
module.exports=async function callers(upstream=false){
 const lib=upstream?require('./node_modules/@google-cloud/storage'):require('../../packages/vgoogle-cloud-storage');
 const objects=new Map(),requests=[],sessions=new Map();let endpoint,session=0,transient=0;
 const errors=[];
 const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,endpoint);const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks);requests.push({method:req.method,path:url.pathname,query:Object.fromEntries(url.searchParams),headers:req.headers,body});
  const json=(code,value)=>{res.writeHead(code,{'content-type':'application/json'});res.end(JSON.stringify(value));};
  const put=(name,data,metadata={})=>{const crc=new lib.CRC32C();crc.update(data);const m={...metadata,name,bucket:'fixture',size:String(data.length),generation:'123',md5Hash:createHash('md5').update(data).digest('base64'),crc32c:crc.toString()};if(name==='bad-checksum')m.crc32c='AAAAAA==';objects.set(name,{data,metadata:m});return m;};
  if(url.pathname==='/storage/v1/b'&&req.method==='POST'){assert.equal(url.searchParams.get('project'),'fixture-project');const value=JSON.parse(body);return json(200,value);}
  if(url.pathname==='/storage/v1/b/fixture'&&req.method==='GET')return json(200,{name:'fixture'});
  if(url.pathname==='/storage/v1/b/fixture/o'&&req.method==='GET'){
   const prefix=url.searchParams.get('prefix')||'',all=[...objects.values()].filter(x=>x.metadata.name.startsWith(prefix));const index=Number(url.searchParams.get('pageToken')||0);return json(200,{items:all.slice(index,index+1).map(x=>x.metadata),...(index+1<all.length?{nextPageToken:String(index+1)}:{})});
  }
  if(url.pathname==='/upload/storage/v1/b/fixture/o'&&req.method==='POST'){
   const type=url.searchParams.get('uploadType');
   if(type==='resumable'){const id=String(++session),metadata=JSON.parse(body);sessions.set(id,{...metadata,name:metadata.name||url.searchParams.get('name')});res.writeHead(200,{location:endpoint+'/session/'+id});return res.end();}
   assert.equal(type,'multipart');
   const boundary=/boundary=(?:"([^"]+)"|([^;]+))/.exec(req.headers['content-type']);assert(boundary);const marker=Buffer.from('--'+(boundary[1]||boundary[2]));
   const first=body.indexOf(Buffer.from('\r\n\r\n'))+4,next=body.indexOf(marker,first),metadata=JSON.parse(body.subarray(first,next-2));
   const dataStart=body.indexOf(Buffer.from('\r\n\r\n'),next)+4,end=body.indexOf(marker,dataStart)-2,data=body.subarray(dataStart,end);
   return json(200,put(metadata.name||url.searchParams.get('name'),data,metadata));
  }
  if(url.pathname.startsWith('/session/')){
   assert.equal(req.method,'PUT');const m=sessions.get(url.pathname.slice('/session/'.length));assert(m);return json(200,put(m.name,body,m));
  }
  if(url.pathname.startsWith('/storage/v1/b/fixture/o/')){
   const name=decodeURIComponent(url.pathname.slice('/storage/v1/b/fixture/o/'.length)),item=objects.get(name);
   if(name==='transient'&&req.method==='GET'){if(++transient===1)return json(503,{error:{code:503,message:'retry'}});return json(200,{name:'transient'});}
   if(!item)return json(404,{error:{code:404,message:'not found'}});
   if(req.method==='GET'&&url.searchParams.get('alt')==='media'){res.writeHead(200,{'content-type':item.metadata.contentType||'application/octet-stream','x-goog-hash':'crc32c='+item.metadata.crc32c+',md5='+item.metadata.md5Hash});return res.end(item.data);}
   if(req.method==='GET')return json(200,item.metadata);
   if(req.method==='DELETE'){objects.delete(name);res.writeHead(204);return res.end();}
  }
  throw new Error('Unhandled '+req.method+' '+url.pathname);
 }catch(error){errors.push(error);res.writeHead(500,{'content-type':'application/json'});res.end(JSON.stringify({error:{message:error.message}}));}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));endpoint='http://127.0.0.1:'+server.address().port;
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-storage-http-'));
 try{
  const storage=new lib.Storage({projectId:'fixture-project',apiEndpoint:endpoint,useAuthWithCustomEndpoint:false,retryOptions:{autoRetry:false}}),bucket=storage.bucket('fixture');
  assert.equal((await bucket.exists())[0],true);assert.equal((await storage.createBucket('created',{location:'us-central1'}))[0].name,'created');
  const bytes=Buffer.from([0,13,10,255,37,47,65,66]);
  await bucket.file('writeups/café #1.pdf').save(bytes,{resumable:false,contentType:'application/pdf'});
  assert.deepEqual(objects.get('writeups/café #1.pdf').data,bytes);assert.equal(objects.get('writeups/café #1.pdf').metadata.contentType,'application/pdf');
  await new Promise((resolve,reject)=>bucket.file('writeups/two.json').save('{"ok":true}',{resumable:false},e=>e?reject(e):resolve()));
  assert.equal(objects.get('writeups/two.json').metadata.contentType,'application/json');
  const file=bucket.file('writeups/café #1.pdf');assert.equal((await file.exists())[0],true);assert.equal((await bucket.file('missing').exists())[0],false);
  assert.deepEqual((await file.download())[0],bytes);
  const query={prefix:'writeups/'},[files]=await bucket.getFiles(query);assert.deepEqual(files.map(f=>f.name).sort(),['writeups/café #1.pdf','writeups/two.json']);assert.deepEqual(query,{prefix:'writeups/'});
  const [one,next]=await bucket.getFiles({prefix:'writeups/',autoPaginate:false});assert.equal(one.length,1);assert.equal(next.pageToken,'1');
  const streamed=[];for await(const item of bucket.getFilesStream({prefix:'writeups/'}))streamed.push(item.name);assert.equal(streamed.length,2);
  const local=path.join(directory,'image.png');fs.writeFileSync(local,bytes);
  await bucket.upload(local,{destination:'images/local.png',resumable:false,metadata:{contentType:'image/png',metadata:{purpose:'fixture'}}});assert.deepEqual(objects.get('images/local.png').data,bytes);
  // The default upload uses the SDK's resumable transport and native AbortController.
  await bucket.file('resumable.txt').save('resumable payload',{validation:'crc32c'});assert.equal(objects.get('resumable.txt').data.toString(),'resumable payload');
  await new Promise((resolve,reject)=>file.delete({ignoreNotFound:true},e=>e?reject(e):resolve()));await file.delete({ignoreNotFound:true});
  await assert.rejects(()=>file.delete(),e=>e.code===404);
  for(const f of files)await f.delete({ignoreNotFound:true});
  assert.equal((await bucket.getFiles({prefix:'writeups/'}))[0].length,0);
  await assert.rejects(()=>bucket.file('bad-checksum').save('bad hash fixture',{resumable:false}),e=>e.code==='FILE_NO_UPLOAD');assert.equal(objects.has('bad-checksum'),false);
  const retrying=new lib.Storage({projectId:'fixture-project',apiEndpoint:endpoint,useAuthWithCustomEndpoint:false,retryOptions:{autoRetry:true,maxRetries:1,retryDelayMultiplier:1,maxRetryDelay:0.001,totalTimeout:5}});
  assert.equal((await retrying.bucket('fixture').file('transient').getMetadata())[0].name,'transient');assert.equal(transient,2);
  assert.deepEqual(errors,[]);
  console.log(`${upstream?'Upstream':'VPM'} Storage HTTP callers: ${requests.length} requests; binary/simple/resumable/local-file uploads, CRC32C/MD5, download, paginated/manual/streamed listing, exists, callbacks, cleanup, bad-checksum deletion, transient retry and bucket creation.`);
  return requests.length;
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.rmSync(directory,{recursive:true,force:true});}
};
if(require.main===module)module.exports(process.argv.includes('--upstream')).catch(e=>{console.error(e);process.exitCode=1;});

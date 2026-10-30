'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createRequire}=require('node:module'),{pathToFileURL}=require('node:url'),{createHash}=require('node:crypto');
module.exports=async function callers(upstream=false){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-path-matcher-'));
 const modules=path.join(__dirname,'node_modules');
 assert.equal(require('./node_modules/fast-xml-parser/package.json').version,'5.11.2');
 assert.equal(require('./node_modules/fast-xml-builder/package.json').version,'1.3.1');
 fs.writeFileSync(path.join(directory,'package.json'),'{"type":"module"}');
 fs.symlinkSync(modules,path.join(directory,'node_modules'),'dir');
 for(const [name,target]of [['fast-xml-parser','parser'],['fast-xml-builder','builder']])fs.cpSync(path.join(modules,name,'src'),path.join(directory,target),{recursive:true});
 function edit(file,old,next,count=1){const dest=path.join(directory,file),source=fs.readFileSync(dest,'utf8');assert.equal(source.split(old).length,count+1,file);fs.writeFileSync(dest,source.replaceAll(old,next));}
 edit('parser/xmlparser/OrderedObjParser.js',"from 'path-expression-matcher'","from '../../matcher.mjs'",2);
 edit('parser/xmlparser/node2json.js',"from 'path-expression-matcher'","from '../../matcher.mjs'");
 edit('parser/xmlbuilder/json2xml.js',"from 'fast-xml-builder'","from '../../builder/fxb.js'",2);
 for(const file of ['fxb.js','orderedJs2Xml.js'])edit('builder/'+file,"from 'path-expression-matcher'","from '../matcher.mjs'");
 const target=upstream?path.join(modules,'path-expression-matcher/src/index.js'):require.resolve('../../packages/vpath-expression-matcher');
 const load=upstream?`import * as lib from ${JSON.stringify(pathToFileURL(target).href)};`:`import {createRequire} from 'node:module';const lib=createRequire(import.meta.url)(${JSON.stringify(target)});`;
 fs.writeFileSync(path.join(directory,'matcher.mjs'),load+`
 export const calls={push:0,pop:0,matches:0,reset:0,expressions:0};
 export class Matcher extends lib.Matcher {
  push(...a){calls.push++;return super.push(...a);}
  pop(...a){calls.pop++;return super.pop(...a);}
  matches(...a){calls.matches++;return super.matches(...a);}
  reset(...a){calls.reset++;return super.reset(...a);}
 }
 export class Expression extends lib.Expression {constructor(...a){super(...a);calls.expressions++;}}
 export const ExpressionSet=lib.ExpressionSet,MatcherView=lib.MatcherView;
 `);
 const storagePackage=require.resolve('../retry-request-conformance/node_modules/@google-cloud/storage/package.json'),fixture=createRequire(storagePackage),xmlEntry=fixture.resolve('fast-xml-parser');
 assert.equal(require(storagePackage).version,'8.4.0');
 const oldXML=require(xmlEntry),prefix=path.dirname(storagePackage)+path.sep,saved=new Map(Object.entries(require.cache).filter(([file])=>file.startsWith(prefix)));
 try{
  const xml=await import(pathToFileURL(path.join(directory,'parser/fxp.js')).href);
  const control=await import(pathToFileURL(path.join(modules,'fast-xml-parser/src/fxp.js')).href);
  const adapter=await import(pathToFileURL(path.join(directory,'matcher.mjs')).href);
  const document='<root><item id="one">1</item><item id="two"><b>2</b></item><raw><b>three</b></raw></root>';
  for(const options of [{},{ignoreAttributes:false},{preserveOrder:true},{stopNodes:['root.raw']},{stopNodes:['..raw']},{stopNodes:['root.*']},{stopNodes:['root.item[id=two]'],ignoreAttributes:false}]){
   assert.deepEqual(new xml.XMLParser(options).parse(document),new control.XMLParser(options).parse(document));
  }
  const captured=[];const parser=new xml.XMLParser({jPath:false,ignoreAttributes:false,stopNodes:[new adapter.Expression('root.raw')],tagValueProcessor:(name,value,view)=>{captured.push([name,view.toString(),view.getDepth(),view.getCounter(),view.getAttrValue('id')]);assert.equal(view.push,undefined);return value;}});
  const parsed=parser.parse(document);assert.equal(parsed.root.raw,'<b>three</b>');assert.ok(captured.some(row=>row[0]==='item'&&row[1]==='root.item'&&row[3]===0&&row[4]==='one'),JSON.stringify(captured));
  assert.deepEqual(parser.parse(document),parsed,'reusable parser resets matching state');
  parser.parse('<root><item id="one">1</item><item id="two">2</item></root>');assert.ok(captured.some(row=>row[0]==='item'&&row[3]===1&&row[4]==='two'));
  // Root-level deep wildcard is documented to allow zero intermediate levels.
  const rootRaw='<script><b>one</b></script>';
  const rootResult=new xml.XMLParser({stopNodes:['..script']}).parse(rootRaw);
  assert.deepEqual(rootResult,upstream?{script:{b:'one'}}:{script:'<b>one</b>'});
  const dotted=new xml.XMLParser({stopNodes:['root.item[url=a.b]'],ignoreAttributes:false}).parse('<root><item url="a.b"><b>one</b></item></root>');
  assert.equal(typeof dotted.root.item['#text'],upstream?'undefined':'string');
  for(const options of [{},{stopNodes:['root.raw']},{jPath:false,stopNodes:[new adapter.Expression('root.raw')]}]){
   const plainOptions={...options,stopNodes:options.stopNodes?.map(String)};
   assert.equal(new xml.XMLBuilder(options).build({root:{item:'one',raw:'<b>two</b>'}}),new control.XMLBuilder(plainOptions).build({root:{item:'one',raw:'<b>two</b>'}}));
  }
  const ordered=[{root:[{raw:[{'#text':'<b>two</b>'}]}]}];
  assert.equal(new xml.XMLBuilder({preserveOrder:true,stopNodes:['root.raw']}).build(ordered),'<root><raw><b>two</b></raw></root>');
  assert.ok(adapter.calls.matches>0);assert.ok(adapter.calls.expressions>0);assert.ok(adapter.calls.reset>=2);
  for(const [file]of saved)delete require.cache[file];
  require.cache[xmlEntry].exports={...oldXML,XMLParser:xml.XMLParser,XMLBuilder:xml.XMLBuilder};
  const {TransferManager}=fixture('@google-cloud/storage');
  let requests=0;const beforeStorage={...adapter.calls};
  const filename=path.join(directory,'payload');fs.writeFileSync(filename,'abcd');
  for(const buffer of [false,true]){
   const seen=[];const bucket={name:'fixture',storage:{apiEndpoint:'https://storage.googleapis.com',retryOptions:{maxRetries:0,retryDelayMultiplier:1,maxRetryDelay:1,totalTimeout:10,autoRetry:false,retryableErrorFn:()=>false},authClient:{request:async options=>{
    requests++;const url=new URL(options.url);seen.push(options.method);
    if(url.searchParams.has('uploads')){const data='<InitiateMultipartUploadResult><UploadId>upload-123</UploadId><Bucket>fixture</Bucket><Key>payload</Key></InitiateMultipartUploadResult>';return{data:buffer?Buffer.from(data):data,headers:{}};}
    assert.equal(url.searchParams.get('uploadId'),'upload-123');
    if(url.searchParams.has('partNumber')){assert.equal(url.searchParams.get('partNumber'),'1');assert.equal(Buffer.from(options.body).toString(),'abcd');assert.equal(options.headers.get('content-md5'),createHash('md5').update('abcd').digest('base64'));return{data:'',headers:{etag:'etag-1'}};}
    assert.equal(options.body,'<CompleteMultipartUpload><Part><PartNumber>1</PartNumber><ETag>etag-1</ETag></Part></CompleteMultipartUpload>');return{data:{done:true},headers:{}};
   }}}};
   assert.equal((await new TransferManager(bucket).uploadFileInChunks(filename,{chunkSizeBytes:4,concurrencyLimit:1,maxQueueSize:1,validation:'md5'})).data.done,true);assert.deepEqual(seen,['POST','PUT','POST']);
  }
  assert.equal(requests,6);assert.ok(adapter.calls.push>beforeStorage.push);assert.ok(adapter.calls.pop>beforeStorage.pop);
  console.log(`${upstream?'Upstream':'VPM'} matcher callers: 7 differential parser modes, view callbacks, reusable parser, zero-level stop node, dotted attribute, 4 builder modes, 2 Storage uploads / 6 requests; ${JSON.stringify(adapter.calls)}.`);
 }finally{
  require.cache[xmlEntry].exports=oldXML;for(const file of Object.keys(require.cache))if(file.startsWith(prefix))delete require.cache[file];for(const [file,module]of saved)require.cache[file]=module;fs.rmSync(directory,{recursive:true,force:true});
 }
};
if(require.main===module)module.exports(process.argv.includes('--upstream')).catch(e=>{console.error(e);process.exitCode=1;});

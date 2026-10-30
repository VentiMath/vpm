'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const root=path.resolve(__dirname,'..'),upstream=await import(pathToFileURL(path.resolve(__dirname,'../../../scripts/xml-parser-conformance/node_modules/fast-xml-parser/src/fxp.js')).href),vpm=require('..');
 const initiation='<?xml version="1.0" encoding="UTF-8"?><InitiateMultipartUploadResult xmlns="https://storage.googleapis.com"><Bucket>fixture</Bucket><Key>café&amp;file</Key><UploadId>upload-123</UploadId></InitiateMultipartUploadResult>',buffer=Buffer.from(initiation);
 const initExpected={'?xml':'',InitiateMultipartUploadResult:{Bucket:'fixture',Key:'café&file',UploadId:'upload-123'}};
 const parts='<ListPartsResult>'+Array.from({length:128},(_,i)=>'<Part><PartNumber>'+(i+1)+'</PartNumber><ETag>&quot;tag-'+(i+1)+'&quot;</ETag><Size>4096</Size></Part>').join('')+'</ListPartsResult>';
 const parserCase=(name,xml,opts,expected)=>({name,make:A=>{const p=new A.XMLParser(opts);return()=>p.parse(xml);},validate:value=>assert.deepEqual(value,expected)});
 const cases=[
  {name:'construct default parser',make:A=>()=>new A.XMLParser(),validate:p=>assert.equal(typeof p.parse,'function')},
  {name:'construct configured parser',make:A=>()=>new A.XMLParser({ignoreAttributes:false,stopNodes:['r.raw'],htmlEntities:true}),validate:p=>assert.equal(typeof p.parse,'function')},
  {name:'Storage fresh initiation string',make:A=>()=>new A.XMLParser().parse(initiation),validate:v=>assert.deepEqual(v,initExpected)},
  {name:'Storage fresh initiation Buffer',make:A=>()=>new A.XMLParser().parse(buffer),validate:v=>assert.deepEqual(v,initExpected)},
  parserCase('reused initiation parser',initiation,undefined,initExpected),
  parserCase('128 listed parts',parts,undefined,{ListPartsResult:{Part:Array.from({length:128},(_,i)=>({PartNumber:i+1,ETag:'"tag-'+(i+1)+'"',Size:4096}))}}),
  parserCase('attributes and numbers','<r><item id="7" enabled="true">12.5</item></r>',{ignoreAttributes:false,parseAttributeValue:true},{r:{item:{'#text':12.5,'@_id':7,'@_enabled':true}}}),
  parserCase('8 KiB text with entities','<r>'+'a'.repeat(8192)+'&amp;&lt;</r>',undefined,{r:'a'.repeat(8192)+'&<'}),
  parserCase('ordered mixed text','<r>before<a>1</a><![CDATA[raw]]>after</r>',{preserveOrder:true},[{r:[{'#text':'before'},{a:[{'#text':1}]},{'#text':'raw'},{'#text':'after'}]}]),
  parserCase('compiled raw stop node','<r><raw><b>raw</b></raw></r>',{stopNodes:['r.raw']},{r:{raw:'<b>raw</b>'}}),
  parserCase('DTD entity document','<!DOCTYPE r [<!ENTITY custom "value">]><r>&custom;</r>',undefined,{r:'value'}),
  {name:'validate initiation XML',make:A=>()=>A.XMLValidator.validate(initiation),validate:v=>assert.equal(v,true)},
  {name:'reject mismatched closing tag',make:A=>()=>A.XMLValidator.validate('<r><a>value</r>')!==true,validate:v=>assert.equal(v,true)}
 ];
 const files=['index.js','index.mjs','bench/compare.cjs','../../scripts/xml-parser-conformance/upstream/SHA256.json'];
 function sources(directory,prefix){for(const item of fs.readdirSync(directory,{withFileTypes:true})){if(['test','bench','node_modules'].includes(item.name))continue;const f=path.join(directory,item.name),rel=prefix+'/'+item.name;if(item.isDirectory())sources(f,rel);else if(/\.(c?js|mjs)$/.test(item.name))files.push(rel);}}
 sources(path.join(root,'lib'),'lib');for(const name of ['vfast-xml-builder','vnodable-entities','vis-unsafe','vpath-expression-matcher','vstrnum','vanynum','vxml-naming'])sources(path.join(root,'..',name),'../'+name);
 await require('../../../scripts/bench-paired.cjs').run({root,upstream,vpm,cases,files});
})().catch(e=>{console.error(e);process.exitCode=1;});

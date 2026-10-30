'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{pathToFileURL}=require('node:url');
function expect(actual){return{
 toBe:v=>assert.equal(actual,v),toEqual:v=>assert.deepEqual(actual,v),toContain:v=>assert.ok(actual.includes(v)),
 toBeGreaterThan:v=>assert.ok(actual>v),toBeUndefined:()=>assert.equal(actual,undefined),toBeTrue:()=>assert.equal(actual,true),
 toThrowError:v=>assert.throws(actual,typeof v==='string'?e=>e.message===v:v),
 not:{toEqual:v=>assert.notDeepEqual(actual,v),toContain:v=>assert.ok(!actual.includes(v)),toThrowError:()=>assert.doesNotThrow(actual),toBe:v=>assert.notEqual(actual,v)}
};}
async function run(upstream=process.argv.includes('--upstream')){
 const base=path.join(__dirname,'upstream'),installed=path.join(__dirname,'node_modules/fast-xml-parser');
 for(const [file,hash]of Object.entries(require('./upstream/SHA256.json'))){
  const snapshot=fs.readFileSync(path.join(base,file));assert.equal(createHash('sha256').update(snapshot).digest('hex'),hash,file);
  if(file.startsWith('src/'))assert.equal(snapshot.toString().trimEnd(),fs.readFileSync(path.join(installed,file.slice(0,-4)),'utf8').trimEnd(),file);
 }
 assert.equal(require(path.join(installed,'package.json')).version,'5.11.2');
 const api=upstream?await import(pathToFileURL(path.join(installed,'src/fxp.js')).href):require('../../packages/vfast-xml-parser');
 const entities=upstream?await import(pathToFileURL(path.join(__dirname,'node_modules/@nodable/entities/src/index.js')).href):require('../../packages/vnodable-entities');
 const {Expression}=upstream?await import(pathToFileURL(path.join(__dirname,'node_modules/path-expression-matcher/src/index.js')).href):require('../../packages/vpath-expression-matcher');
 const utils=require('../../packages/vfast-xml-parser/lib/util.js');
 const tests=[],stack=[],failures=[],counts={},omitted=[];
 for(const file of fs.readdirSync(path.join(base,'spec')).filter(f=>f.endsWith('_spec.js.txt')).sort()){
  if(file==='large_spec.js.txt'){omitted.push(file);continue;}
  let code=fs.readFileSync(path.join(base,'spec',file),'utf8').replace(/^import .*\r?\n/gm,'').replace(/\bxit\(/g,'it(').replace('import.meta.url','__sourceURL');
  const sourceURL=pathToFileURL(path.join(base,'spec',file)).href;
  const args={...api,EntityDecoder:entities.EntityDecoder,COMMON_HTML:entities.COMMON_HTML,Expression,...utils,
   fs:{readFileSync:(file,...args)=>fs.readFileSync(file+'.txt',...args)},path,fileURLToPath:require('node:url').fileURLToPath,dirname:path.dirname,__sourceURL:sourceURL,
   describe:(name,fn)=>{stack.push(name);fn();stack.pop();},it:(name,fn)=>tests.push({file,name:[...stack,name].join(' / '),fn}),expect,console:{log(){},error(){}}
  };
  new Function(...Object.keys(args),'"use strict";\n'+code)(...Object.values(args));
 }
 for(const {file,name,fn}of tests){counts[file]=(counts[file]||0)+1;const proto=Object.getOwnPropertyDescriptors(Object.prototype);try{await fn();}catch(error){failures.push({file,name,error:error.message});}finally{for(const key of Reflect.ownKeys(Object.prototype))if(!Object.hasOwn(proto,key))delete Object.prototype[key];Object.defineProperties(Object.prototype,proto);}}
 const known=upstream?[
  ['entities_spec.js.txt','XMLParser External Entities / should set and parse for valid entity set externally',/Missing expected exception/],
  ['x2j_str_spec.js.txt','XMLParser / should parse a XML to JSON string',/prettifyString is not a function/]
 ]:[
  ['attr_spec.js.txt','XMLParser / should err for invalid attributes',/boolean attribute '=' is not allowed/],
  ['data_spec.js.txt','XMLParser / should parse attributes with valid names',/Invalid entity reference in attribute/],
  ['entities_spec.js.txt','XMLParser Entities / should parse attributes with valid names, default entities',/Invalid entity reference in attribute/],
  ['entities_spec.js.txt','XMLParser External Entities / should set and parse for valid entity set externally',/Invalid entity name: #xD/],
  ['validator_spec.js.txt','XML Validator / should not validate xml with non closing comment',/Comment is not closed/],
  ['validator_spec.js.txt','XML Validator / should fail for XML with ! which is not a comment, DOCTYPE or CDATA',/Unknown XML declaration/],
  ['validator_spec.js.txt','XML Validator / should validate value with ampersand',/InvalidChar/],
  ['valueProcessors_spec.js.txt','XMLParser / should decode HTML entities / char',/Invalid entity reference in attribute/],
  ['x2j_str_spec.js.txt','XMLParser / should parse a XML to JSON string',/prettifyString is not a function/]
 ];
 assert.equal(tests.length,331);assert.deepEqual(failures.map(f=>[f.file,f.name]),known.map(k=>k.slice(0,2)));
 failures.forEach((f,i)=>assert.match(f.error,known[i][2]));
 assert.deepEqual(omitted,['large_spec.js.txt']);
 console.log(`${upstream?'Upstream':'VPM'} retained XML cases: ${331-failures.length} unchanged passes; ${upstream?0:7} specified validation differences; 2 originally disabled diagnostics. One 102 MB upstream asset case omitted; generated stress coverage is separate.`);
 return{cases:tests.length,counts,failures};
}
module.exports=run;if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});

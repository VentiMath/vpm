'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{pathToFileURL}=require('node:url');
function expect(actual){return{
 toBe:v=>assert.equal(actual,v),toEqual:v=>assert.deepEqual(actual,v),toContain:v=>assert.ok(actual.includes(v),JSON.stringify(actual)+' does not contain '+JSON.stringify(v)),
 toBeDefined:()=>assert.notEqual(actual,undefined),toBeUndefined:()=>assert.equal(actual,undefined),toBeTrue:()=>assert.equal(actual,true),toBeFalse:()=>assert.equal(actual,false),toBeTruthy:()=>assert.ok(actual),toBeFalsy:()=>assert.ok(!actual),
 toThrowError:v=>assert.throws(actual,typeof v==='string'?e=>e.message===v:v),toThrow:()=>assert.throws(actual),toMatch:v=>assert.match(actual,v),
 not:{toContain:v=>assert.ok(!actual.includes(v)),toThrow:()=>assert.doesNotThrow(actual),toThrowError:()=>assert.doesNotThrow(actual),toBe:v=>assert.notEqual(actual,v)}
};}
async function run(upstream=process.argv.includes('--upstream')){
 const base=path.join(__dirname,'upstream'),installed=path.join(__dirname,'node_modules/fast-xml-builder');
 for(const [file,hash]of Object.entries(require('./upstream/SHA256.json')))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(base,file))).digest('hex'),hash,file);
 assert.equal(require(path.join(installed,'package.json')).version,'1.3.1');
 for(const file of fs.readdirSync(path.join(base,'src')))assert.equal(fs.readFileSync(path.join(base,'src',file),'utf8').trimEnd(),fs.readFileSync(path.join(installed,'src',file.slice(0,-4)),'utf8').trimEnd(),file);
 const XMLBuilder=upstream?(await import(pathToFileURL(path.join(installed,'src/fxb.js')).href)).default:require('../../packages/vfast-xml-builder');
 const {XMLParser}=require('./node_modules/fast-xml-parser');
 const {Expression}=upstream?await import(pathToFileURL(path.join(__dirname,'node_modules/path-expression-matcher/src/index.js')).href):require('../../packages/vpath-expression-matcher');
 assert.equal(require('./node_modules/legacy-entities/package.json').version,'2.1.0');
 assert.equal(require('./node_modules/fast-xml-parser/package.json').version,'5.11.2');
 const {EntityEncoder}=await import(pathToFileURL(path.join(__dirname,'node_modules/legacy-entities/src/index.js')).href);
 const tests=[],stack=[],failures=[],counts={};
 for(const file of fs.readdirSync(path.join(base,'spec')).sort()){
  let code=fs.readFileSync(path.join(base,'spec',file),'utf8').replace(/^import .*\r?\n/gm,'').replace(/\bxit\(/g,'it(');
  new Function('XMLBuilder','XMLParser','EntityEncoder','Expression','describe','it','expect','console','"use strict";\n'+code)(XMLBuilder,XMLParser,EntityEncoder,Expression,(name,fn)=>{stack.push(name);fn();stack.pop();},(name,fn)=>tests.push({file,name:[...stack,name].join(' / '),fn}),expect,{log(){}});
 }
 for(const {file,name,fn}of tests){counts[file]=(counts[file]||0)+1;const proto=Object.getOwnPropertyDescriptors(Object.prototype);try{await fn();}catch(error){failures.push({file,name,error:error.message});}finally{for(const key of Reflect.ownKeys(Object.prototype))if(!Object.hasOwn(proto,key))delete Object.prototype[key];Object.defineProperties(Object.prototype,proto);}}

 assert.equal(tests.length,136);
 assert.deepEqual(failures.map(f=>f.file+':'+f.name),['format_spec.js.txt:Format without indentation / when order is not preserved']);
 assert.match(failures[0].error,/Expected values to be strictly deep-equal/);
 assert.equal(new XMLBuilder({format:true,indentBy:''}).build({root:{child1:'hello',child2:'world'}}),'<root>\n<child1>hello</child1>\n<child2>world</child2>\n</root>\n');
 console.log(`${upstream?'Upstream':'VPM'} retained builder cases: 135 pass; one originally disabled formatting mismatch reproduced. No cases skipped.`);
 return{cases:tests.length,counts};
}
module.exports=run;if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});

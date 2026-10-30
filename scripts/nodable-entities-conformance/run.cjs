'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{pathToFileURL}=require('node:url');
function expect(actual){return{toBe:value=>assert.equal(actual,value),toEqual:value=>assert.deepEqual(actual,value),toBeNull:()=>assert.equal(actual,null),toHaveLength:n=>assert.equal(actual.length,n),toHaveProperty:key=>assert.ok(Object.hasOwn(actual,key)),toBeGreaterThan:n=>assert.ok(actual>n),toBeInstanceOf:cls=>assert.ok(actual instanceof cls),toThrow:error=>assert.throws(actual,error),not:{toThrow:()=>assert.doesNotThrow(actual),toBeNull:()=>assert.notEqual(actual,null)}};}
async function run(upstream=process.argv.includes('--upstream')){
 const base=path.join(__dirname,'upstream'),installed=path.join(__dirname,'node_modules/@nodable/entities');
 for(const [file,hash]of Object.entries(require('./upstream/SHA256.json')))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(base,file))).digest('hex'),hash,file);
 assert.equal(require(path.join(installed,'package.json')).version,'3.1.0');
 for(const file of fs.readdirSync(path.join(base,'src')))assert.equal(fs.readFileSync(path.join(base,'src',file),'utf8').trimEnd(),fs.readFileSync(path.join(installed,'src',file.slice(0,-4)),'utf8').trimEnd(),file);
 const lib=upstream?await import(pathToFileURL(path.join(installed,'src/index.js')).href):require('../../packages/vnodable-entities');
 const tests=[],counts={},failures=[];
 for(const file of fs.readdirSync(path.join(base,'specs')).sort()){
  let code=fs.readFileSync(path.join(base,'specs',file),'utf8');
  if(!upstream){
   const edits=file==='EntityEncoder.test.js.txt'?[
    ["const s = 'The quick brown fox jumps over the lazy dog. 1234567890';\n    expect(enc.encode(s)).toBe(s);","const s = 'The quick brown fox jumps over the lazy dog. 1234567890';\n    expect(enc.encode(s)).toBe('The quick brown fox jumps over the lazy dog&period; 1234567890');"],
    [".toBe('&lt;b&gt;&quot;hello&quot;&lt;/b&gt;')",".toBe('&lt;b&gt;&quot;hello&quot;&lt;&sol;b&gt;')"],
    [".toBe('abc 123 !@#')",".toBe('abc 123 &excl;&commat;&num;')"],
   ]:[];
   for(const [old,next]of edits){assert.equal(code.split(old).length,2,old);code=code.replace(old,next);}
  }
  code=code.replace(/^import[\s\S]*?from ['"][^'"]+['"];?\r?\n/gm,'');
  const stack=[];const register=(name,fn)=>tests.push({file,name:[...stack,name].join(' / '),fn});
  const keys=Object.keys(lib);new Function(...keys,'XML_ENTITIES','assert','describe','test','it','expect','"use strict";\n'+code)(...keys.map(k=>lib[k]),lib.XML,assert,(name,fn)=>{stack.push(name);fn();stack.pop();},register,register,expect);
 }
 for(const {file,name,fn}of tests){counts[file]=(counts[file]||0)+1;try{await fn();}catch(error){failures.push({file,name,error:error.message});}}
 assert.deepEqual(counts,{'EntityDecoder.ncr.test.js.txt':37,'EntityDecoder.test.js.txt':150,'EntityEncoder.test.js.txt':59});
 assert.deepEqual(failures,[]);
 console.log(`${upstream?'Upstream':'VPM'} retained entity cases: 246 passed${upstream?'':', three explicit ASCII-encoding adaptations'}.`);
 return{counts,failures};
}
module.exports=run;if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});

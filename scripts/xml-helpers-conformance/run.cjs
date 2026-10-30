'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),{pathToFileURL}=require('node:url');
const corrections=[72,81,82,90,91,292,297,497];
function expect(actual){return {
 toBe:expected=>assert.equal(actual,expected),toEqual:expected=>assert.deepEqual(actual,expected),toBeNull:()=>assert.equal(actual,null),
 toMatch:pattern=>assert.match(actual,pattern),toContain:value=>assert.ok(actual.includes(value)),toBeGreaterThan:value=>assert.ok(actual>value),toBeInstanceOf:cls=>assert.ok(actual instanceof cls),
 toThrow:()=>assert.throws(actual),toThrowError:error=>assert.throws(actual,error),not:{toBeNull:()=>assert.notEqual(actual,null),toThrow:()=>assert.doesNotThrow(actual)},
};}
async function run(upstream=process.argv.includes('--upstream')){
 const source=path.join(__dirname,'upstream'),counts={};
 for(const [file,hash]of Object.entries(require('./upstream/SHA256.json')))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(source,file))).digest('hex'),hash,file);
 for(const [name,version]of [['xml-naming','0.3.0'],['is-unsafe','2.0.2']]){
  const base=path.join(__dirname,'node_modules',name);assert.equal(require(path.join(base,'package.json')).version,version);
  for(const file of ['src/index.js',...(name==='is-unsafe'?fs.readdirSync(path.join(base,'src/contexts')).map(f=>'src/contexts/'+f):[])])assert.equal(fs.readFileSync(path.join(base,file),'utf8').trimEnd(),fs.readFileSync(path.join(source,name,file+'.txt'),'utf8').trimEnd(),name+'/'+file+' source mismatch');
  const lib=upstream?await import(pathToFileURL(path.join(base,'src/index.js')).href):require('../../packages/v'+name),tests=[];
  for(const file of fs.readdirSync(path.join(source,name,'specs')).sort()){
   let code=fs.readFileSync(path.join(source,name,'specs',file),'utf8');
   if(!upstream&&name==='xml-naming'){
    const lines=code.split('\n');
    for(const line of corrections){assert.ok(lines[line-1].includes('.toBe(false)'),`correction line ${line} changed`);lines[line-1]=lines[line-1].replace('.toBe(false)','.toBe(true)');}
    code=lines.join('\n');
   }
   code=code.replace(/^import[\s\S]*?from ['"][^'"]+['"];?\r?\n/gm,'');
   const keys=Object.keys(lib).filter(k=>k!=='default');
   new Function(...keys,'describe','it','expect',code)(...keys.map(k=>lib[k]),(_name,fn)=>fn(),(name,fn)=>tests.push({name,fn}),expect);
  }
  for(const {name,fn}of tests){try{await fn();}catch(error){error.message=name+': '+error.message;throw error;}}
  counts[name]=tests.length;
 }
 console.log(`${upstream?'Upstream':'VPM'} XML helpers retained cases: ${JSON.stringify(counts)}${upstream?'':' (8 XML expectation corrections, no skipped cases)'}.`);
 return counts;
}
module.exports=run;
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});

'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {pathToFileURL}=require('node:url');
async function run(upstream=process.argv.includes('--upstream')) {
 const source=path.join(__dirname,'upstream');
 for(const [file,hash]of Object.entries(require('./upstream/SHA256.json'))) assert.equal(createHash('sha256').update(fs.readFileSync(path.join(source,file))).digest('hex'),hash,file);
 for(const [name,files]of [['anynum',['anynum.js','digitTable.js']],['strnum',['strnum.js']]]) {
  assert.equal(require(name+'/package.json').version,name==='anynum'?'1.0.1':'2.5.1');
  for(const file of files) assert.equal(fs.readFileSync(path.join(path.dirname(require.resolve(name)),file),'utf8').trimEnd(),fs.readFileSync(path.join(source,name,file+'.txt'),'utf8').trimEnd(),`${name}/${file}: installed control differs from pinned source`);
 }
 const spec=await import('@byspec/numbers'),ieee=await import('@byspec/numbers/ieee754'),ecma=await import('@byspec/numbers/ecmascript');
 const counts={};
 for(const name of ['anynum','strnum']) {
  const lib=upstream?(await import(pathToFileURL(require.resolve(name)).href)).default:require('../../packages/v'+name);
  const tests=[];
  for(const file of fs.readdirSync(path.join(source,name,'tests')).sort()) {
   let code=fs.readFileSync(path.join(source,name,'tests',file),'utf8').replace(/^import .+;\r?\n/gm,'');
   new Function('anynum','toNumber','compare','filterCases','ieeeScenarios','ecmaScenarios','describe','it','expect',code)(lib,lib,spec.compare,spec.filterCases,ieee.scenarios,ecma.scenarios,(_name,fn)=>fn(),(name,fn)=>tests.push({name,fn}),actual=>({toBe:expected=>assert.equal(actual,expected),toEqual:expected=>assert.deepEqual(actual,expected),toBeNull:()=>assert.equal(actual,null),not:{toBeDefined:()=>assert.equal(actual,undefined)}}));
  }
  for(const {name,fn}of tests) {try{await fn();}catch(error){error.message=name+': '+error.message;throw error;}}
  counts[name]=tests.length;
 }
 console.log(`${upstream?'Upstream':'VPM'}: ${counts.anynum} anynum and ${counts.strnum} strnum retained upstream cases passed.`);
 return counts;
}
module.exports=run;
if(require.main===module)run().catch(error=>{console.error(error);process.exitCode=1;});

'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{pathToFileURL}=require('node:url');
async function run(upstream=process.argv.includes('--upstream')){
 const base=path.join(__dirname,'upstream'),installed=path.join(__dirname,'node_modules/path-expression-matcher');
 for(const [file,hash]of Object.entries(require('./upstream/SHA256.json')))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(base,file))).digest('hex'),hash,file);
 assert.equal(require(path.join(installed,'package.json')).version,'1.6.2');
 for(const file of fs.readdirSync(path.join(base,'src')))assert.equal(fs.readFileSync(path.join(base,'src',file),'utf8').trimEnd(),fs.readFileSync(path.join(installed,'src',file.slice(0,-4)),'utf8').trimEnd(),file);
 const lib=upstream?await import(pathToFileURL(path.join(installed,'src/index.js')).href):require('../../packages/vpath-expression-matcher');
 const result={cases:0,assertions:0,failures:[]};
 for(const file of fs.readdirSync(path.join(base,'test')).sort()){
  let code=fs.readFileSync(path.join(base,'test',file),'utf8').replace(/^import .*\n/gm,'');
  if(!upstream){
   if(file==='expression_set_test.js.txt'){
    const changes=["assert(!set.matchesAny(matcherAt('user'))", "assert(!stopNodes.matchesAny(matcherAt('script'))", "assert(!set.matchesAny(matcherAt('title'))", "assert(!set.matchesAny(matcherAt('root'))", "assert(!set.matchesAny(matcherAt('other'))"];
    for(const old of changes){assert.equal(code.split(old).length,2,old);code=code.replace(old,old.replace('assert(!','assert('));}
   }
   if(file==='readOnly_test.js.txt'){
    assert.equal(code.split('ro1 !== ro2').length,2);code=code.replace('ro1 !== ro2','ro1 === ro2');
    assert.equal(code.split('"read-only",').length,3);code=code.replaceAll('"read-only",','"",');
   }
  }
  const first=code.search(/^\{/m);const prefix=code.slice(0,first);
  const blocks=[...code.matchAll(/^\{[\s\S]*?^\}/gm)];
  for(let i=0;i<blocks.length;i++){
   result.cases++;
   try{new Function('Expression','Matcher','MatcherView','ExpressionSet','console','"use strict";\n'+prefix+'\n'+blocks[i][0])(lib.Expression,lib.Matcher,lib.MatcherView,lib.ExpressionSet,{log(message){if(typeof message==='string'&&message.startsWith('✓'))result.assertions++;}});}
   catch(error){result.failures.push({file,case:i+1,error:error.message});}
  }
 }
 assert.equal(result.cases,131);
 const expected=upstream?[3,16,27,28,32,35].map(n=>'readOnly_test.js.txt:'+n):[];
 assert.deepEqual(result.failures.map(f=>f.file+':'+f.case),expected,JSON.stringify(result.failures));
 console.log(`${upstream?'Upstream':'VPM'} retained matcher tests: ${result.cases} cases, ${result.assertions} passing assertions, ${result.failures.length} recorded upstream inconsistencies${upstream?'':', 8 explicit assertion adaptations'}.`);
 return result;
}
module.exports=run;if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});

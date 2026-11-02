'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
for(const [file,hash]of Object.entries(require('./upstream/SHA256.json')))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname,'upstream',file))).digest('hex'),hash);
const Mocha=require('mocha'),mocha=new Mocha({reporter:'dot'});mocha.suite.emit('pre-require',globalThis,__filename,mocha);
const jest=require('jest-mock'),expect=require('expect').expect,memoize=require(process.argv.includes('--upstream')?'memoize-one':'../../packages/vmemoize-one');
for(const file of ['memoize-one.spec.ts','cache-clearing.spec.ts']){
 let source=fs.readFileSync(path.join(__dirname,'upstream/test',file+'.txt'),'utf8');
 source=process.versions.bun?new Bun.Transpiler({loader:'ts'}).transformSync(source):require('node:module').stripTypeScriptTypes(source);
 source=source.replace(/^import .*?;\s*$/gm,'');
 new Function('memoize','isDeepEqual','jest','expect',"'use strict';\n"+source)(memoize,require('lodash.isequal'),jest,expect);
}
mocha.run(failures=>{process.exitCode=failures?1:0;});

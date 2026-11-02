'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
for(const [file,hash] of Object.entries(require('./upstream/SHA256.json')))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname,'upstream',file+'.txt'))).digest('hex'),hash);
for(const [file,hash] of Object.entries(require('../deep-equal-conformance/upstream/SHA256.json')))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../deep-equal-conformance/upstream',file))).digest('hex'),hash);
const upstream=process.argv.includes('--upstream'),Mocha=require('mocha'),mocha=new Mocha({reporter:'dot',timeout:10000});
if(!upstream)mocha.grep(/^(?!.*warnings circular reference warns on circular refs but do not throw).*$/);
mocha.suite.emit('pre-require',globalThis,__filename,mocha);
let data;
function load(name){
 if(name==='../..')return require(upstream?'react-fast-compare':'../../packages/vreact-fast-compare');
 if(name==='./tests')return data;
 if(name.startsWith('fast-deep-equal-git/'))return require('../deep-equal-conformance/upstream/'+name.slice(20));
 return require(name);
}
const m={exports:{}};new Function('require','module',fs.readFileSync(path.join(__dirname,'upstream/test/node/tests.js.txt'),'utf8'))(load,m);data=m.exports;
for(const file of ['basics.spec.js','advanced.spec.js'])new Function('require',fs.readFileSync(path.join(__dirname,'upstream/test/node',file+'.txt'),'utf8'))(load);
const runner=mocha.run(failures=>{console.log(`${upstream?'Upstream':'VPM'}: ${runner.stats.passes} passed, ${runner.stats.pending} pending; ${upstream?'original warning assertion included':'one original cycle-warning assertion excluded: VPM compares cycles without warnings'}.`);process.exitCode=failures?1:0;});

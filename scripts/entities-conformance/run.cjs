'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const source=path.join(__dirname,'upstream');
for(const [file,hash]of Object.entries(require('./upstream/SHA256.json')))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(source,file))).digest('hex'),hash,file);
const target=process.argv.includes('--upstream')?require.resolve('html-entities'):path.resolve(__dirname,'../../packages/vhtml-entities/index.js');
// Type erasure is fixture preparation on Node 24. Both runtimes execute identical JS.
let code=fs.readFileSync(path.join(source,'test/index.test.ts.txt'),'utf8');
code=code.slice(code.indexOf("describe('package'"));
code=code.replace(/beforeAll\(async \(\) => \{[\s\S]*?\n    \}\);/, 'beforeAll(()=>{({encode,decode,decodeEntity}=target);});');
const start=code.indexOf('    if (process.env.TEST_DIST)'),end=code.indexOf("    describe('encode()'",start);
assert.ok(start>0&&end>start);code=code.slice(0,start)+code.slice(end);
code=code.replace('{} as typeof HtmlEntities','{}');
// Run the built-in stripper in Node even when the selected test runtime is Bun.
const stripped=spawnSync('node',['--disable-warning=ExperimentalWarning','-e',"process.stdout.write(require('node:module').stripTypeScriptTypes(require('node:fs').readFileSync(0,'utf8')));"],{input:code,encoding:'utf8'});assert.equal(stripped.status,0,stripped.stderr);code=stripped.stdout;
const tests=[],setup=[];
const namedReferences=require(path.join(path.dirname(require.resolve('html-entities')),'named-references.js')).namedReferences;
const readPackage={readFile:async()=>JSON.stringify(require(process.argv.includes('--upstream')?'html-entities/package.json':'../../packages/vhtml-entities/package.json'))};
const run=new Function('target','namedReferences','fs','describe','it','beforeAll','expect',code);
run(require(target),namedReferences,readPackage,(_name,fn)=>fn(),(name,fn)=>tests.push({name,fn}),fn=>setup.push(fn),actual=>({toEqual:expected=>assert.deepEqual(actual,expected)}));
(async()=>{for(const fn of setup)await fn();for(const {name,fn}of tests){try{await fn();}catch(e){e.message=name+': '+e.message;throw e;}}console.log(`${process.argv.includes('--upstream')?'html-entities':'vhtml-entities'}: ${tests.length} retained upstream runtime/metadata cases passed, including every HTML5 entity.`);})().catch(e=>{console.error(e);process.exitCode=1;});

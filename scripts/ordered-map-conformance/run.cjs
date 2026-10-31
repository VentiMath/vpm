'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const {compile}=require('../platform-types.cjs');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'vordered-map-tests-'));
try {
  for(const [file,hash] of Object.entries(require('./upstream/SHA256.json'))) assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname,'upstream',file))).digest('hex'),hash,file);
  const upstream=process.argv.includes('--upstream'),target=require.resolve(upstream?'./node_modules/@js-sdsl/ordered-map':'../../packages/vordered-map');
  const source=fs.readFileSync(path.join(__dirname,'upstream/test/TreeContainerTest/OrderedMap.test.ts.txt'),'utf8');
  assert.equal(source.split("from '@/index'").length,2);
  fs.writeFileSync(path.join(temporary,'suite.ts'),source.replace("from '@/index'","from './bridge.cjs'"));
  const result=compile({files:[path.join(temporary,'suite.ts')],compilerOptions:{rootDir:temporary,outDir:temporary,target:'ES2022',module:'CommonJS',noCheck:true}});
  assert.equal(result.status,0,result.output);
  fs.writeFileSync(path.join(temporary,'bridge.cjs'),`exports.OrderedMap=require(${JSON.stringify(target)}).OrderedMap;exports.Vector=require(${JSON.stringify(require.resolve('js-sdsl'))}).Vector;`);
  fs.mkdirSync(path.join(temporary,'node_modules'));
  for(const name of ['chai','mocha']) fs.symlinkSync(path.join(__dirname,'node_modules',name),path.join(temporary,'node_modules',name));
  // Seed upstream's random workload in the harness, with identical draws for both variants.
  fs.writeFileSync(path.join(temporary,'run.cjs'),`let seed=0x51d51;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);const Mocha=require('mocha'),m=new Mocha({reporter:'json',timeout:30000});m.addFile(__dirname+'/suite.js');m.run(n=>{process.exitCode=n?1:0;});`);
  const run=spawnSync(process.execPath,[path.join(temporary,'run.cjs')],{encoding:'utf8',maxBuffer:4e6});
  assert.equal(run.status,0,run.stdout+run.stderr);
  const report=JSON.parse(run.stdout.slice(run.stdout.indexOf('{\n  "stats"')));
  assert.equal(report.stats.tests,14);assert.equal(report.stats.passes,14);assert.equal(report.stats.pending,0);
  console.log(`${upstream?'Upstream':'VPM'} ordered-map: 14 unchanged upstream tests passed (seeded workload, import adapter only).`);
} finally {fs.rmSync(temporary,{recursive:true,force:true});}

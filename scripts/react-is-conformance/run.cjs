'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), os=require('node:os'), vm=require('node:vm');
const {createHash}=require('node:crypto'),{createRequire}=require('node:module'),{spawnSync}=require('node:child_process');
const local=createRequire(path.join(__dirname,'package.json'));
const source=fs.readFileSync(path.join(__dirname,'upstream/ReactIs-test.js'),'utf8');
const metadata=JSON.parse(fs.readFileSync(path.join(__dirname,'upstream/provenance.json')));
assert.equal(createHash('sha256').update(source).digest('hex'),metadata.sha256);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-react-is-suite-'));
try {
  fs.writeFileSync(path.join(temp,'suite.jsx'),source);
  const built=spawnSync('bun',['build',path.join(temp,'suite.jsx'),'--target','node','--format','cjs','--external','*','--outfile',path.join(temp,'suite.cjs')],{encoding:'utf8'});
  assert.equal(built.status,0,built.stdout+built.stderr);
  for(const variant of ['upstream','vpm']) {
    const tests=[];let before=()=>{};
    const React={...local('react-latest'),unstable_SuspenseList:Symbol.for('react.suspense_list')};
    const context={exports:{},console,document:{createElement:()=>({nodeType:1})},
      describe:(_name,fn)=>fn(),beforeEach:fn=>{before=fn;},it:(name,fn)=>tests.push({name,fn}),
      expect:actual=>({toBe:expected=>assert.equal(actual,expected),toEqual:expected=>assert.deepEqual(actual,expected)}),
      gate:fn=>fn({enableSuspenseList:true}),jest:{resetModules(){},fn:()=>()=>{}},
      require:name=>name==='react'?React:name==='react-is'?(variant==='upstream'?local('react-is'):require('../../packages/vreact-is')):name.startsWith('react/jsx')?local(name.replace('react/','react-latest/')):local(name)};
    vm.runInNewContext(fs.readFileSync(path.join(temp,'suite.cjs'),'utf8'),context,{filename:'upstream/ReactIs-test.js'});
    assert.equal(tests.length,14);
    for(const test of tests) {before();try{test.fn();}catch(error){throw new Error(`${variant}: ${test.name}`,{cause:error});}}
    console.log(`${variant}: all ${tests.length} unchanged upstream ReactIs tests pass.`);
  }
} finally {fs.rmSync(temp,{recursive:true,force:true});}

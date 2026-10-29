'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
const upstream=process.argv.includes('--upstream'),root=path.resolve(__dirname,'../..'),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-http-helpers-'));
function run(args,options={}){const r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:30000,...options});assert.equal(r.status,0,r.stdout+r.stderr+String(r.error||''));console.log(r.stdout.trim());}
try{
 for(const[name,version,hash]of[['extend','3.0.2','8043b954596da3689718754af1ec1a54727a28aafab37223aea862155c6bb910'],['is-stream','2.0.1','84d01b48a49f0c61e6b0db191dfc9acbc750a38f1111b72a1cb23fac6687800f']]){
  const archive=path.join(__dirname,`${name}-${version}.tar.gz`);assert.equal(createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),hash);
  const dir=path.join(temporary,name);fs.mkdirSync(dir);const extracted=spawnSync('tar',['-xzf',archive,'--strip-components=1','-C',dir]);assert.equal(extracted.status,0);
  const target=path.join(root,upstream?'scripts/consumers/node_modules/'+name:'packages/'+(name==='extend'?'vextend':'vis-stream'));
  if(name==='extend'){
   let source=fs.readFileSync(path.join(dir,'test/index.js'),'utf8').replace("require('../index')",'require('+JSON.stringify(target)+')').replace("require('tape')",'require('+JSON.stringify(require.resolve('tape'))+')');
   // Array.isArray is guaranteed on supported runtimes; do not delete a native
   // intrinsic that the runtime and test runner themselves depend on.
   source=source.replace("test('works without Array.isArray'","test.skip('works without Array.isArray'");fs.writeFileSync(path.join(dir,'test/index.js'),source);run([path.join(dir,'test/index.js')]);
  }else{
   let source=fs.readFileSync(path.join(dir,'test.js'),'utf8').replace(/^import .*;\n/gm,'');
   const setup=`const fs=require('node:fs'),Stream=require('node:stream'),net=require('node:net'),assert=require('node:assert/strict');\nconst isStream=require(${JSON.stringify(target)});let checks=0,files=0;const tempy={file:()=>${JSON.stringify(dir)}+'/output-'+files++};const test=(name,fn)=>{fn({true:v=>{assert.equal(v,true);checks++;},false:v=>{assert.equal(v,false);checks++;}});};\n`;
   fs.writeFileSync(path.join(dir,'test.cjs'),setup+source+'\nconsole.log("is-stream: "+checks+" upstream assertions passed");');run([path.join(dir,'test.cjs')],{cwd:dir});
  }
 }
}finally{fs.rmSync(temporary,{recursive:true,force:true});}

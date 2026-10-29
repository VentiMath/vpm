'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'../..'),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'vjson-conformance-')),upstream=process.argv.includes('--upstream');
function run(command,args,options={}){const r=spawnSync(command,args,{encoding:'utf8',timeout:120000,...options});if(r.status!==0)console.log(r.stdout+r.stderr);assert.equal(r.status,0,String(r.error||r.signal||'Failed'));return r.stdout;}
try{
 const archive=path.join(__dirname,'json-bigint-1.0.0.tar.gz');assert.equal(createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),'ac3b3d6f47d6e88eccc46132c095fb5ffa00b8341c3c5845769f7a04ab7a7791');
 run('tar',['-xzf',archive,'--strip-components=1','-C',temporary]);fs.symlinkSync(path.join(__dirname,'node_modules'),path.join(temporary,'node_modules'),'dir');
 const target=path.join(root,upstream?'scripts/consumers/node_modules/json-bigint':'packages/vjson-bigint');fs.writeFileSync(path.join(temporary,'index.js'),'module.exports=require('+JSON.stringify(target)+');');
 for(const name of fs.readdirSync(path.join(temporary,'test'))){if(!name.endsWith('.js'))continue;const file=path.join(temporary,'test',name);let s=fs.readFileSync(file,'utf8');
  s=s.replaceAll("require('chai')", 'require('+JSON.stringify(require.resolve('chai4'))+')');
  s=s.replaceAll("require('bignumber.js')",upstream?'require('+JSON.stringify(path.join(root,'scripts/consumers/node_modules/bignumber.js'))+')':"require('../index').ExactNumber");
  if(!upstream){s=s.replace('Duplicate key "dupkey"','Duplicate object key').replace('Incorrect value for protoAction option, must be "error", "ignore" or undefined but passed invalid value','Invalid protoAction option').replace('Incorrect value for constructorAction option, must be "error", "ignore" or undefined but passed invalid value','Invalid constructorAction option');}
  fs.writeFileSync(file,s);
 }
 console.log(run(process.execPath,[require.resolve('mocha/bin/mocha.js'),'--no-config','--no-package','--reporter','dot','test/*.js'],{cwd:temporary}));
}finally{fs.rmSync(temporary,{recursive:true,force:true});}

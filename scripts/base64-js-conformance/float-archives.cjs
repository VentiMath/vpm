'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const {execFileSync} = require('node:child_process');
const folder = fs.mkdtempSync(path.join(os.tmpdir(),'vpm-float-pack-'));
const pkg = path.resolve(__dirname,'../../packages/vieee754');
const run = (bin,args,cwd,env={}) => execFileSync(bin,args,{cwd,encoding:'utf8',env:{...process.env,...env,npm_config_cache:folder+'/cache',BUN_INSTALL_CACHE_DIR:folder+'/bun-cache'}});
try {
  const archive = JSON.parse(run('npm',['pack',pkg,'--json','--ignore-scripts'],folder))[0].filename;
  for(const manager of ['npm','bun']){
    const cwd=folder+'/'+manager;fs.mkdirSync(cwd);
    fs.writeFileSync(cwd+'/package.json',JSON.stringify({private:true,dependencies:{'vieee754':'file:../'+archive}}));
    run(manager,['install','--ignore-scripts'],cwd);
    run(manager,manager==='npm'?['ci','--ignore-scripts']:['install','--frozen-lockfile','--ignore-scripts'],cwd);
    fs.writeFileSync(cwd+'/check.mjs',`import assert from 'node:assert/strict';import {createRequire} from 'node:module';
      import api,{read,write} from 'vieee754';
      const cjs=createRequire(import.meta.url)('vieee754');assert.equal(cjs,api);assert.equal(write,cjs.write);
      const bytes=new Uint8Array(8);write(bytes,-0,0,true,52,8);assert.ok(Object.is(read(bytes,0,true,52,8),-0));`);
    for(const bin of ['node','bun']){
      run(bin,['check.mjs'],cwd);
      run(bin,[__dirname+'/float-caller.cjs'],cwd,{VIEEE754_PACKAGE:cwd+'/node_modules/vieee754'});
    }
  }
  console.log('Fresh/frozen npm and Bun installs pass CJS, ESM and browser Buffer floating-point checks');
}finally{fs.rmSync(folder,{recursive:true,force:true})}

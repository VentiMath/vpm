'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const {execFileSync} = require('node:child_process');
const folder = fs.mkdtempSync(path.join(os.tmpdir(),'vpm-base64-pack-'));
const pkg = path.resolve(__dirname,'../../packages/vbase64-js');
const run = (bin,args,cwd,env={}) => execFileSync(bin,args,{cwd,encoding:'utf8',env:{...process.env,...env,npm_config_cache:folder+'/cache',BUN_INSTALL_CACHE_DIR:folder+'/bun-cache'}});
try {
  const archive = JSON.parse(run('npm',['pack',pkg,'--json','--ignore-scripts'],folder))[0].filename;
  for(const manager of ['npm','bun']){
    const cwd=folder+'/'+manager;fs.mkdirSync(cwd);
    fs.writeFileSync(cwd+'/package.json',JSON.stringify({private:true,dependencies:{'vbase64-js':'file:../'+archive}}));
    run(manager,['install','--ignore-scripts'],cwd);
    run(manager,manager==='npm'?['ci','--ignore-scripts']:['install','--frozen-lockfile','--ignore-scripts'],cwd);
    fs.writeFileSync(cwd+'/check.mjs',`import assert from 'node:assert/strict';import {createRequire} from 'node:module';
      import api,{fromByteArray,toByteArray} from 'vbase64-js';
      const cjs=createRequire(import.meta.url)('vbase64-js');assert.equal(cjs,api);assert.equal(fromByteArray,cjs.fromByteArray);assert.deepEqual([...toByteArray(fromByteArray(Uint8Array.of(128)))],[128]);`);
    for(const bin of ['node','bun']){
      run(bin,['check.mjs'],cwd);
      run(bin,[__dirname+'/caller.cjs'],cwd,{VBASE64_JS_PACKAGE:cwd+'/node_modules/vbase64-js'});
    }
  }
  console.log('Fresh/frozen npm and Bun installs pass CJS, ESM and browser Buffer and plist checks');
}finally{fs.rmSync(folder,{recursive:true,force:true})}

'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const {execFileSync} = require('node:child_process');
const folder = fs.mkdtempSync(path.join(os.tmpdir(),'vpm-varint-pack-'));
const pkg = path.resolve(__dirname,'../../packages/vvarint');
const run = (bin,args,cwd,env={}) => execFileSync(bin,args,{cwd,encoding:'utf8',env:{...process.env,...env,npm_config_cache:folder+'/cache',BUN_INSTALL_CACHE_DIR:folder+'/bun-cache'}});
try {
  const archive = JSON.parse(run('npm',['pack',pkg,'--json','--ignore-scripts'],folder))[0].filename;
  for(const manager of ['npm','bun']){
    const cwd=folder+'/'+manager;fs.mkdirSync(cwd);
    fs.writeFileSync(cwd+'/package.json',JSON.stringify({private:true,dependencies:{'vvarint':'file:../'+archive}}));
    run(manager,['install','--ignore-scripts'],cwd);
    run(manager,manager==='npm'?['ci','--ignore-scripts']:['install','--frozen-lockfile','--ignore-scripts'],cwd);
    fs.writeFileSync(cwd+'/check.mjs',`import assert from 'node:assert/strict';import {createRequire} from 'node:module';
      import api,{encode,decode} from 'vvarint';
      const cjs=createRequire(import.meta.url)('vvarint');assert.equal(cjs,api);assert.equal(encode,cjs.encode);assert.equal(decode(encode(789)),789);`);
    for(const bin of ['node','bun']){
      run(bin,['check.mjs'],cwd);
      run(bin,[__dirname+'/caller.cjs'],cwd,{VVARINT_PACKAGE:cwd+'/node_modules/vvarint'});
    }
  }
  console.log('Fresh/frozen npm and Bun installs pass CJS, ESM and Sass compiler checks');
}finally{fs.rmSync(folder,{recursive:true,force:true})}

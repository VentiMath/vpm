'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const {execFileSync} = require('node:child_process');
const folder = fs.mkdtempSync(path.join(os.tmpdir(),'vpm-css-map-'));
const pkg = path.resolve(__dirname,'../../packages/vsource-map-js');
const run = (bin,args,cwd,env={}) => execFileSync(bin,args,{cwd,encoding:'utf8',env:{...process.env,...env,npm_config_cache:folder+'/cache',BUN_INSTALL_CACHE_DIR:folder+'/bun-cache'}});
try {
  const archive = JSON.parse(run('npm',['pack',pkg,'--json','--ignore-scripts'],folder))[0].filename;
  for(const manager of ['npm','bun']){
    const cwd=folder+'/'+manager;fs.mkdirSync(cwd);
    fs.writeFileSync(cwd+'/package.json',JSON.stringify({private:true,dependencies:{'vsource-map-js':'file:../'+archive}}));
    run(manager,['install','--ignore-scripts'],cwd);
    run(manager,manager==='npm'?['ci','--ignore-scripts']:['install','--frozen-lockfile','--ignore-scripts'],cwd);
    fs.writeFileSync(cwd+'/check.mjs',`import assert from 'node:assert/strict';import {createRequire} from 'node:module';
      import {SourceMapConsumer,SourceMapGenerator} from 'vsource-map-js';import {SourceMapGenerator as Subpath} from 'vsource-map-js/lib/source-map-generator.js';
      const api=createRequire(import.meta.url)('vsource-map-js');assert.equal(api.SourceMapConsumer,SourceMapConsumer);assert.equal(SourceMapGenerator,Subpath);`);
    for(const bin of ['node','bun']){
      run(bin,['check.mjs'],cwd);
      run(bin,[__dirname+'/caller.cjs'],cwd,{VSOURCE_MAP_PACKAGE:cwd+'/node_modules/vsource-map-js'});
    }
  }
  console.log('Fresh/frozen npm and Bun installs pass root, subpath and CSS caller checks');
}finally{fs.rmSync(folder,{recursive:true,force:true})}

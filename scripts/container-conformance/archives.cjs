'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const assert = require('node:assert/strict');
const {execFileSync, spawnSync} = require('node:child_process');
const root = path.resolve(__dirname,'../..');
const name = process.argv[2] || 'vis-inside-container';
assert(['vis-inside-container','vis-wsl'].includes(name));
const alias = name.slice(1);
const temp = fs.mkdtempSync(path.join(os.tmpdir(),name+'-archive-'));
const run = (bin,args,cwd=temp,env={}) => execFileSync(bin,args,{cwd,encoding:'utf8',timeout:120000,env:{...process.env,npm_config_cache:temp+'/npm-cache',BUN_INSTALL_CACHE_DIR:temp+'/bun-cache',npm_config_audit:'false',npm_config_fund:'false',...env}});
try {
  const archives = {};
  function pack(pkg) {
    if (archives[pkg]) return;
    const manifest = require(root+'/packages/'+pkg+'/package.json');
    for (const dep of Object.keys(manifest.dependencies || {})) pack(dep);
    const archive = JSON.parse(run('npm',['pack',root+'/packages/'+pkg,'--ignore-scripts','--json']))[0];
    assert(archive.files.every(f=>!f.path.startsWith('test/')&&!f.path.startsWith('bench/')));
    archives[pkg] = archive.filename;
  }
  pack(name);
  for (const manager of ['npm','bun']) {
    const cwd = temp+'/'+manager;fs.mkdirSync(cwd);
    const dependencies = Object.fromEntries(Object.entries(archives).map(([pkg,file])=>[pkg===name?alias:pkg,'file:../'+file]));
    const overrides = Object.fromEntries(Object.entries(dependencies).filter(([pkg])=>pkg!==alias));
    fs.writeFileSync(cwd+'/package.json',JSON.stringify({private:true,type:'module',dependencies,overrides}));
    run(manager,['install','--ignore-scripts'],cwd);
    run(manager,manager==='npm'?['ci','--ignore-scripts']:['install','--frozen-lockfile','--ignore-scripts'],cwd);
    for (const pkg of Object.keys(archives)) assert.equal(JSON.parse(fs.readFileSync(cwd+'/node_modules/'+(pkg===name?alias:pkg)+'/package.json')).name,pkg);
    const packageDir = cwd+'/node_modules/'+alias;
    fs.writeFileSync(cwd+'/check.mjs',`import assert from 'node:assert/strict';import {createRequire} from 'node:module';import value from '${alias}';const require=createRequire(import.meta.url);assert.equal(value,require('${alias}'));const found=typeof value==='function'?value():value;assert.equal(typeof found,'boolean');process.stdout.write(String(found));`);
    for (const runtime of ['node','bun']) {
      const detected = run(runtime,['check.mjs'],cwd)==='true';
      const bins = JSON.parse(fs.readFileSync(packageDir+'/package.json')).bin || {};
      for (const bin of Object.keys(bins)) {
        const result = spawnSync(runtime,[cwd+'/node_modules/.bin/'+bin],{cwd,encoding:'utf8',timeout:10000});
        assert.ifError(result.error);assert.equal(result.status,detected?0:2);assert.equal(result.stdout,'');assert.equal(result.stderr,'');
      }
      const kind = name === 'vis-wsl' ? 'wsl' : 'container';
      process.stdout.write(run(runtime,[__dirname+'/'+kind+'.cjs'],cwd,{['VPM_'+kind.toUpperCase()+'_PACKAGE']:packageDir}));
    }
    const types = fs.readFileSync(root+'/packages/'+name+'/test/types.ts','utf8').replaceAll("'../index.cjs'",JSON.stringify(alias));
    fs.writeFileSync(cwd+'/check.cts',types);fs.writeFileSync(cwd+'/check.mts',types);
    const platform = require('../platform-types.cjs');
    const config = platform.configuration([cwd+'/check.cts',cwd+'/check.mts']);platform.clean(platform.compile(config));
    config.files=[cwd+'/check.mts'];config.compilerOptions.module='ESNext';config.compilerOptions.moduleResolution='Bundler';platform.clean(platform.compile(config));
  }
  console.log(`${name}: fresh/frozen npm+Bun installs, complete VPM closure, CJS/ESM, CLI where present, callers and TS7 pass.`);
} finally {fs.rmSync(temp,{recursive:true,force:true})}

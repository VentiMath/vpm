'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const reader=require('..');
const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'vread-package-up-upstream-')));
const previous=process.cwd();
(async()=>{
  try {
    fs.copyFileSync(path.join(__dirname,'fixtures/upstream-package.json'),path.join(root,'package.json'));
    fs.mkdirSync(path.join(root,'fixture'));
    process.chdir(root);
    const tests=[];
    // Module loading, AVA registration and the required normalize: false opt-out
    // are adapted. Original assertions run in an isolated process with the
    // upstream package metadata as fixture.
    const source=fs.readFileSync(path.join(__dirname,'fixtures/upstream-tests.mjs'),'utf8')
      .replace(/^import .*;\n/gm,'').replaceAll('import.meta.url','fixtureURL');
    new Function('path','test','readPackageUp','readPackageUpSync','fixtureURL',source)(path,(name,fn)=>tests.push({name,fn}),options=>reader.readPackageUp({normalize:false,...options}),options=>reader.readPackageUpSync({normalize:false,...options}),pathToFileURL(path.join(root,'test.js')));
    const selected=tests.filter(test=>test.name===process.argv[2]);assert.equal(selected.length,1);
    await selected[0].fn({is:assert.strictEqual,deepEqual:assert.deepStrictEqual});
  } finally { process.chdir(previous);fs.rmSync(root,{recursive:true,force:true}); }
})().catch(error=>{console.error(error);process.exitCode=1;});

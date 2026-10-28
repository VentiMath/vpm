'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const vpm=require('..');
async function baseline(modules=path.resolve(__dirname,'../../../scripts/consumers/node_modules')) {
  const entry=path.join(modules,'read-package-up/index.js');
  assert.equal(fs.readFileSync(entry,'utf8'),fs.readFileSync(path.join(__dirname,'fixtures/read-package-up-11.0.0.mjs'),'utf8'),'upstream baseline must be unchanged');
  return import(pathToFileURL(entry).href);
}
async function compare(root,modules) {
  const upstream=await baseline(modules);let checks=0;
  const directory=path.join(root,'reader-parity'),nested=path.join(directory,'a','b');fs.mkdirSync(nested,{recursive:true});
  const manifests=[{}, {type:'module'}, {name:'pkg',version:' v1.0 ',repository:'owner/repo'}, {custom:['café',1,null,{x:true}]}, JSON.parse('{"__proto__":{"x":1},"constructor":"data"}'), ...Array.from({length:15},(_,i)=>({name:'generated-'+i,type:i%2?'module':'commonjs',custom:{index:i,values:[i,i+1]}}))];
  for(const manifest of manifests) {
    fs.writeFileSync(path.join(directory,'package.json'),JSON.stringify(manifest));
    for(const cwd of [directory,nested,pathToFileURL(nested)]) {
      const options={cwd,stopAt:directory,normalize:false};
      assert.deepEqual(vpm.readPackageUpSync(options),upstream.readPackageUpSync(options));checks++;
      assert.deepEqual(await vpm.readPackageUp(options),await upstream.readPackageUp(options));checks++;
    }
  }
  const options={cwd:nested,stopAt:nested,normalize:false};
  assert.equal(vpm.readPackageUpSync(options),upstream.readPackageUpSync(options));checks++;
  assert.equal(await vpm.readPackageUp(options),await upstream.readPackageUp(options));checks++;
  return checks;
}
module.exports={baseline,compare};

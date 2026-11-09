"use strict";
// Reconstruct immutable history for before/after measurements, without shipping
// or committing a second runtime implementation.
const fs = require('node:fs'), path = require('node:path'), {execFileSync} = require('node:child_process');
const revision = '77440fc668f2d4a26ba93d1a7c634754a977e874';
function prepare() {
  const root=path.resolve(__dirname,'../..'), dir=path.join(__dirname,'node_modules/.setup-before-77440fc6');
  for(const pkg of ['vmotion-dom','vmotion-utils']) {
    const names=execFileSync('git',['ls-tree','--name-only',revision+':packages/'+pkg],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(x=>x.endsWith('.cjs')||x==='package.json');
    const target=pkg==='vmotion-dom'?dir:path.join(dir,'node_modules/vmotion-utils');
    fs.mkdirSync(target,{recursive:true});
    for(const name of names) {
      const data=execFileSync('git',['show',`${revision}:packages/${pkg}/${name}`],{cwd:root});
      const file=path.join(target,name);
      if(!fs.existsSync(file)||!fs.readFileSync(file).equals(data))fs.writeFileSync(file,data);
    }
  }
  return path.join(dir,'index.cjs');
}
module.exports={prepare,revision};

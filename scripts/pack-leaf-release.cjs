'use strict';
// Reuse the committed-snapshot packer; these leaves have no dependency closure.
const assert=require('node:assert/strict');
const configs={
 vpngjs:{packageName:'vpngjs',tagPrefix:'vpngjs',installName:'vpngjs',names:['vpngjs']},
 'js-cookie':{packageName:'vjs-cookie',tagPrefix:'js-cookie',installName:'js-cookie'},
 camelize:{packageName:'vcamelize',tagPrefix:'camelize',installName:'camelize'},
};
function build({leaf,ref,tag,out}) {
 assert.ok(Object.hasOwn(configs,leaf),'Unknown leaf release');
 const packer=leaf==='vpngjs'?'./pack-vlx-release.cjs':'./pack-cssjanus-release.cjs';
 return require(packer).build({ref,tag,out,...configs[leaf]});
}
module.exports={build};
if(require.main===module){const args=process.argv.slice(2),take=k=>args[args.indexOf(k)+1];for(const key of ['--leaf','--ref','--tag','--out'])assert(args.includes(key),'Missing '+key);build({leaf:take('--leaf'),ref:take('--ref'),tag:take('--tag'),out:take('--out')});}

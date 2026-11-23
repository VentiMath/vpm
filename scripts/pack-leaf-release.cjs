'use strict';
// Reuse the committed-snapshot packer; these leaves have no dependency closure.
const assert=require('node:assert/strict');
const configs={
 pngjs:{packageName:'vpngjs',tagPrefix:'pngjs',installName:'pngjs',direct:true},
 'js-cookie':{packageName:'vjs-cookie',tagPrefix:'js-cookie',installName:'js-cookie'},
 camelize:{packageName:'vcamelize',tagPrefix:'camelize',installName:'camelize'},
};
function build({leaf,ref,tag,out}) {
 assert.ok(Object.hasOwn(configs,leaf),'Unknown leaf release');
 return require('./pack-cssjanus-release.cjs').build({ref,tag,out,...configs[leaf]});
}
module.exports={build};
if(require.main===module){const args=process.argv.slice(2),take=k=>args[args.indexOf(k)+1];for(const key of ['--leaf','--ref','--tag','--out'])assert(args.includes(key),'Missing '+key);build({leaf:take('--leaf'),ref:take('--ref'),tag:take('--tag'),out:take('--out')});}

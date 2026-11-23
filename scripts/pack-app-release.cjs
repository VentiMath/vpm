'use strict';
// Public names remain VPM names. Pack committed bytes and pin the entire closure.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const configs={
 vnotistack:{names:['vnotistack','vgoober','vclsx','vreact-transition-group'],direct:['vnotistack'],fixture:'notistack'},
 'vreact-i18next':{names:['vreact-i18next','vi18next'],direct:['vreact-i18next','vi18next'],fixture:'react-i18next'},
 'vreact-hook-form':{names:['vreact-hook-form','vhookform-resolvers','vzod'],direct:['vreact-hook-form','vhookform-resolvers','vzod'],fixture:'zod'},
 'vdate-fns':{names:['vdate-fns'],direct:['vdate-fns'],fixture:'date-fns'},
};
function build({family,ref,tag,out}) {
 const config=configs[family];assert.ok(config,'Unknown app release family');
 const manifest=require('./pack-vlx-release.cjs').build({ref,tag,out,packageName:family,tagPrefix:family,names:config.names});
 const consumer={dependencies:Object.fromEntries(config.direct.map(name=>[name,manifest.packages.find(p=>p.name===name).url]))};
 fs.writeFileSync(path.join(out,'consumer-package.json'),JSON.stringify(consumer,null,2)+'\n');
 const files=[...manifest.packages.map(p=>p.asset),'consumer-package.json','release-manifest.json'];
 fs.writeFileSync(path.join(out,'SHA256SUMS'),files.map(name=>createHash('sha256').update(fs.readFileSync(path.join(out,name))).digest('hex')+'  '+name).join('\n')+'\n');
 return manifest;
}
module.exports={build,configs};
if(require.main===module){const args=process.argv.slice(2),take=k=>args[args.indexOf(k)+1];for(const flag of ['--family','--ref','--tag','--out'])assert.ok(args.includes(flag),'Missing '+flag);build({family:take('--family'),ref:take('--ref'),tag:take('--tag'),out:take('--out')});}

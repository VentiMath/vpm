'use strict';
// Public names remain VPM names. Pack committed bytes and pin the entire closure.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {execFileSync}=require('node:child_process');
const configs={
 vnotistack:{names:['vnotistack','vgoober','vclsx','vreact-transition-group'],direct:['vnotistack'],fixture:'notistack'},
 'vreact-i18next':{names:['vreact-i18next','vi18next'],direct:['vreact-i18next','vi18next'],fixture:'react-i18next'},
 'vreact-hook-form':{names:['vreact-hook-form','vhookform-resolvers','vzod'],direct:['vreact-hook-form','vhookform-resolvers','vzod'],fixture:'zod'},
 'vdate-fns':{names:['vdate-fns'],direct:['vdate-fns'],fixture:'date-fns'},
 'vmui-material':{names:['vmui-material','vmui-system','vmui-utils','vclsx','vmui-private-theming','vmui-styled-engine','vemotion-react','vemotion-cache','vemotion-sheet','vemotion-utils','vstylis','vemotion-serialize','vemotion-hash','vemotion-memoize','vemotion-unitless','vemotion-use-insertion-effect-with-fallbacks','vemotion-styled','vemotion-is-prop-valid','vfloating-ui-dom','vfloating-ui-core','vfloating-ui-utils','vreact-transition-group'],fixture:'mui-material'},
};
// Pin shared contexts at the application root as well as inside the closure.
configs['vmui-material'].direct=configs['vmui-material'].names;
function build({family,ref,tag,out}) {
 const config=configs[family];assert.ok(config,'Unknown app release family');
 const manifest=require('./pack-vlx-release.cjs').build({ref,tag,out,packageName:family,tagPrefix:family,names:config.names});
 const consumer={dependencies:Object.fromEntries(config.direct.map(name=>[name,manifest.packages.find(p=>p.name===name).url]))};
 fs.writeFileSync(path.join(out,'consumer-package.json'),JSON.stringify(consumer,null,2)+'\n');
 const files=[...manifest.packages.map(p=>p.asset),'consumer-package.json','release-manifest.json'];
 if(family==='vmui-material'){
  const aliases={},paths={};
  const read=file=>JSON.parse(execFileSync('git',['show',manifest.sourceCommit+':'+file],{cwd:path.resolve(__dirname,'..'),encoding:'utf8'}));
  const types=value=>value&&typeof value==='object'&&(value.types||types(value.import)||types(value.default));
  for(const name of config.names){
   const provenance=read('packages/'+name+'/PROVENANCE.json');
   const original=provenance.upstream.name||provenance.upstream.package;
   assert.equal(typeof original,'string',name+': upstream import name required');
   assert.ok(!Object.hasOwn(aliases,original),'Duplicate upstream import '+original);
   aliases[original]=name;
   for(const [entry,target] of Object.entries(read('packages/'+name+'/package.json').exports||{})){
    const declaration=types(target);if(typeof declaration!=='string')continue;
    paths[original+(entry==='.'?'':entry.slice(1))]=['./node_modules/'+name+'/'+declaration.replace(/^\.\//,'')];
   }
  }
  for(const [file,data] of [['vite-aliases.json',aliases],['tsconfig-paths.json',paths]]){
   fs.writeFileSync(path.join(out,file),JSON.stringify(data,null,2)+'\n');files.push(file);
  }
 }
 fs.writeFileSync(path.join(out,'SHA256SUMS'),files.map(name=>createHash('sha256').update(fs.readFileSync(path.join(out,name))).digest('hex')+'  '+name).join('\n')+'\n');
 return manifest;
}
module.exports={build,configs};
if(require.main===module){const args=process.argv.slice(2),take=k=>args[args.indexOf(k)+1];for(const flag of ['--family','--ref','--tag','--out'])assert.ok(args.includes(flag),'Missing '+flag);build({family:take('--family'),ref:take('--ref'),tag:take('--tag'),out:take('--out')});}

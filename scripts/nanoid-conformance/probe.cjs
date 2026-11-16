'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),Module=require('node:module');
const own=require(process.env.VPM_NANOID_ROOT||'../../packages/vnanoid'),non=require(process.env.VPM_NANOID_ROOT?process.env.VPM_NANOID_ROOT+'/non-secure.cjs':'../../packages/vnanoid/non-secure.cjs');
let checks=0;
for(const lib of [own,require('nanoid'),require('nanoid-app')]){
 for(const size of [0,1,6,21,128,65537]){assert.equal(lib.nanoid(size).length,size);checks++}
 for(const alphabet of ['a','abcdef','0123456789','αβγ',lib.urlAlphabet])for(const size of [6,21,64]){const f=lib.customAlphabet(alphabet,size),v=f();assert.equal(v.length,size);assert.ok([...v].every(c=>alphabet.includes(c)));checks++}
 assert.equal(lib.random(10).length,10);checks++;
}
// Only the dependency boundary is substituted. The installed PostCSS caller is unchanged.
const fs=require('node:fs'),os=require('node:os'),esbuild=require('esbuild');
const target=path.resolve(process.env.VPM_NANOID_ROOT||path.join(__dirname,'../../packages/vnanoid'));
const file=path.join(os.tmpdir(),'vpm-postcss-'+process.pid+'.cjs');
try{
 const bundle=esbuild.buildSync({entryPoints:[require.resolve('postcss')],bundle:true,platform:'node',format:'cjs',outfile:file,alias:{'nanoid/non-secure':target+'/non-secure.cjs'},metafile:true,logLevel:'silent'});
 assert.ok(Object.keys(bundle.metafile.inputs).some(f=>f.endsWith('vnanoid/non-secure.cjs')));
 const postcss=require(file);
 for(let i=0;i<50;i++){const root=postcss.parse('a { color: red; }');assert.match(root.source.input.from,/^<input css [\w-]{6}>$/);assert.equal(root.first.selector,'a');assert.equal(root.first.first.value,'red');checks++}
}finally{esbuild.stop();fs.rmSync(file,{force:true})}
console.log(checks+' Nano ID current/app shape and unchanged PostCSS parser checks pass');

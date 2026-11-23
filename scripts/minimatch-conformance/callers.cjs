'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),fixture=require('./fixture.cjs');
const control=fixture(),vpm=fixture(process.env.VPM_MINIMATCH_PACKAGE||path.resolve(__dirname,'../../packages/vminimatch')),cwd=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-glob-files-'));
(async()=>{try{
 const paths=['src/ui/card.tsx','src/ui/card.test.tsx','src/ui/data.json','src/.hidden.ts','src/.cache/a.js','functions/src/main.ts','functions/test/main.test.ts','public/app.js','public/favicon.ico','.env','src/a1.js','src/a2.js','src/Z.JS','src/a20.js'];
 for(const f of paths){fs.mkdirSync(path.dirname(cwd+'/'+f),{recursive:true});fs.writeFileSync(cwd+'/'+f,'fixture');}
 const patterns=['**/*','{src,functions}/**/*.{ts,tsx}','src/**/!(*.test).tsx','**/*.@(js|ts)','src/a[12].js','**/.*','src/*','**','public/**','src/a{1..2}.js','src/a{0..200}.js','**/../src/*.js','src/**/../*.js','./src/**','src/*/../*.js'];
 let count=0;
 for(const pattern of patterns)for(const extra of [{},{dot:true},{nocase:true},{nocase:true,platform:'linux'},{ignore:['**/*.test.*','**/.cache/**']},{nodir:true},{absolute:true},{matchBase:true}]){
  const opts={cwd,...extra};const a=control.req('glob/raw').globSync(pattern,opts).sort(),b=vpm.req('glob/raw').globSync(pattern,opts).sort();assert.deepEqual(b,a,JSON.stringify({pattern,extra}));count++;
  assert.deepEqual((await vpm.req('glob/raw').glob(pattern,opts)).sort(),a);count++;
 }
 assert(vpm.calls()>0,'Unbundled glob must actually construct the replacement matcher');const before=vpm.calls();
 const read=f=>f.req('@redocly/openapi-core/lib/utils.js').readFileFromUrl;
 for(const url of ['https://api.example.org/schema.json','https://api.example.org/v1/a.yaml','http://cdn.example.org/a.json','https://private.example.org/a.json']){
  const config={headers:[{matches:'api.example.org/**',name:'X-Fixture',value:'api'},{matches:'https://**/*.json',name:'X-JSON',value:'yes'},{matches:'**/v[12]/*.{json,yaml}',name:'X-Version',value:'yes'}]};
  async function capture(f){let headers;await read(f)(url,{...config,customFetch:async(u,o)=>{headers=o.headers;return {ok:true,headers:new Headers({'content-type':'application/json'}),text:async()=>'{}'};}});return headers;}
  assert.deepEqual(await capture(vpm),await capture(control));count++;
 }
 assert(vpm.calls()>before,'Redocly must actually invoke the replacement matcher');
 console.log(`${count} unchanged glob 13 raw sync/async and Redocly URL/header caller checks pass; ${vpm.calls()} instrumented VPM calls.`);
}finally{control.close();vpm.close();fs.rmSync(cwd,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});

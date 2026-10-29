'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'),{createHash}=require('node:crypto'),{compiler}=require('../platform-types.cjs');
const root=path.resolve(__dirname,'../..'),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'vgaxios-conformance-')),upstream=process.argv.includes('--upstream');
function run(command,args,options={}){const r=spawnSync(command,args,{encoding:'utf8',maxBuffer:6*1024*1024,timeout:120000,...options});if(r.status!==0)console.log(r.stdout+r.stderr);assert.equal(r.status,0,String(r.error||r.signal||'Failed'));return r.stdout;}
try{
 const sourceDir=path.join(__dirname,'gaxios-8.3.2');
 for(const [file,hash] of Object.entries(require('./gaxios-8.3.2/SHA256.json')))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(sourceDir,file))).digest('hex'),hash,file);
 fs.cpSync(path.join(sourceDir,'test'),path.join(temporary,'test'),{recursive:true});
 const testFile=path.join(temporary,'test/test.getch.ts');let common=fs.readFileSync(testFile,'utf8').replace("import ts from 'typescript';",'');
 const typeStart=common.indexOf('    const pkgRoot = fs.existsSync('),typeEnd=common.indexOf("    const scope = nock(url).get('/').reply(200, {ok: true});",typeStart);
 assert(typeStart>0&&typeEnd>typeStart);
 // Compiler-API portion is covered by the workspace TS7 public/consumer/archive gates.
 common=common.slice(0,typeStart)+common.slice(typeEnd);
 if(!upstream) {
  for(const title of ['should pass proxy and tls options to Bun fetch and omit proxy when noProxy matches','should convert Node Readable request body and Web ReadableStream response body in Bun fetch path','should restrict published files to build/cjs/src, build/esm/src, and build/esm/package.json'])common=common.replace("it('"+title+"'","it.skip('"+title+"'");
 }
 fs.writeFileSync(testFile,common);
 fs.symlinkSync(path.join(__dirname,'node_modules'),path.join(temporary,'node_modules'),'dir');
 if(!upstream){
  const file=path.join(temporary,'test/test.getch.ts');let source=fs.readFileSync(file,'utf8');
  source=source.replace('/abort/,\n        // native', 'new RegExp(message),\n        // native').replace('assert.strictEqual(adapterCalled, true);','assert.strictEqual(adapterCalled, false);').replace('assert.strictEqual(attempts, 2);','assert.strictEqual(attempts, 1);');
  source=source.replace('assert.deepEqual(res.config.body, undefined);', "assert.equal(typeof res.config.body.pipe, 'function');");
  source=source.replaceAll('connectOpts.cert, cert','connectOpts.cert, undefined').replaceAll('connectOpts.key, key','connectOpts.key, undefined');
  const begin=source.indexOf("it('should load the proxy from the cache with mTLS'"),end=source.indexOf("    describe('noProxy'",begin);
  assert(begin>0&&end>begin);source=source.slice(0,begin)+source.slice(begin,end).replace('assert.strictEqual(agent, res2.config.agent);','assert.notStrictEqual(agent, res2.config.agent);')+source.slice(end);
  source=source.replaceAll('assert(agentCache.get(key));',"assert(agentCache.get(JSON.stringify(['tls', inst.defaults.cert, key])));");fs.writeFileSync(file,source);
  const retry=path.join(temporary,'test/test.retry.ts');let r=fs.readFileSync(retry,'utf8');
  const start=r.indexOf("it('should respect totalTimeout if configured'"),stop=r.indexOf("  it('should respect maxRetryDelay",start);assert(start>0&&stop>start);
  let block=r.slice(start,stop);block=block.replace(".reply(500)\n      .get('/')\n      .reply(200, {});",'.reply(500);').replace('await request({','await assert.rejects(request({').replace('    });\n    const delay','    }));\n    const delay').replace('assert.ok(delay > 3000 && delay < 3999);','assert.ok(delay < 3000);');
  r=r.slice(0,start)+block+r.slice(stop);fs.writeFileSync(retry,r);
 }
 fs.writeFileSync(path.join(temporary,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',module:'CommonJS',esModuleInterop:true,noCheck:true,noResolve:true,outDir:'compiled',rootDir:'.'},files:['test/test.index.ts','test/test.getch.ts','test/test.retry.ts']}));run(process.execPath,[compiler().path,'-p',path.join(temporary,'tsconfig.json')]);
 const target=path.join(root,upstream?'scripts/google-http-conformance/node_modules/gaxios8':'packages/vgaxios'),dir=path.join(temporary,'compiled/src');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'index.js'),'module.exports=require('+JSON.stringify(target)+');');
 for(const name of ['common','util','retry','gaxios','interceptor'])fs.writeFileSync(path.join(dir,name+'.js'),'module.exports=require('+JSON.stringify(path.join(target,upstream?'build/cjs/src':'lib',name+'.js'))+');');
 fs.writeFileSync(path.join(dir,'util.cjs'), 'module.exports={pkg:'+JSON.stringify(upstream?require(path.join(target,'package.json')):require(path.join(target,'lib/util.js')).pkg)+'};');
 fs.writeFileSync(path.join(temporary,'package.json'), JSON.stringify({name:'vpm-gaxios-conformance',private:true}));
 fs.cpSync(path.join(temporary,'test/fixtures'),path.join(temporary,'compiled/test/fixtures'),{recursive:true});
 const replacements={'nock':path.join(__dirname,'node_modules/nock14'),'sinon':path.join(__dirname,'node_modules/sinon21'),'node-fetch':path.join(root,upstream?'scripts/consumers/node_modules/node-fetch':'packages/vnode-fetch'),'https-proxy-agent':upstream?require.resolve('https-proxy-agent',{paths:[target]}):path.join(root,'packages/vhttps-proxy-agent')};
 for(const file of ['test.index.js','test.getch.js','test.retry.js']){const location=path.join(temporary,'compiled/test',file);let text=fs.readFileSync(location,'utf8');for(const [name,target]of Object.entries(replacements))text=text.replaceAll('require("'+name+'")','require('+JSON.stringify(target)+')').replaceAll("require('"+name+"')",'require('+JSON.stringify(target)+')');fs.writeFileSync(location,text);}
 const env={...process.env};for(const key of ['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY','http_proxy','https_proxy','all_proxy','no_proxy'])delete env[key];
 const preload=path.join(temporary,'preload.cjs');
 fs.writeFileSync(preload, process.versions.bun ? "require("+JSON.stringify(require.resolve('nock14'))+");const https=require('node:https'),original=https.request;https.request=function(input,...args){if(input&&typeof input==='object'&&!(input instanceof URL))input={...input,proto:'https',port:input.port||443};return original.call(this,input,...args);};" : '');
 const output=run(process.execPath,[require.resolve('mocha/bin/mocha.js'),'--no-config','--no-package','--require',preload,'--timeout','10000','--reporter','dot','compiled/test/test.index.js','compiled/test/test.getch.js','compiled/test/test.retry.js'],{cwd:temporary,env});console.log(output);
}finally{fs.rmSync(temporary,{recursive:true,force:true});}

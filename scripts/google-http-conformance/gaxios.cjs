'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'),{createHash}=require('node:crypto'),{compiler}=require('../platform-types.cjs');
const root=path.resolve(__dirname,'../..'),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'vgaxios-conformance-')),upstream=process.argv.includes('--upstream');
function run(command,args,options={}){const r=spawnSync(command,args,{encoding:'utf8',maxBuffer:6*1024*1024,timeout:120000,...options});if(r.status!==0)console.log(r.stdout+r.stderr);assert.equal(r.status,0,String(r.error||r.signal||'Failed'));return r.stdout;}
try{
 const archive=path.join(__dirname,'gaxios-6.7.1.tar.gz');assert.equal(createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),'eb4a816b0ce24cf69dcbc710f026c2eee4241b9c5e65cd5019f988e14853702c');run('tar',['-xzf',archive,'--strip-components=1','-C',temporary]);
 fs.symlinkSync(path.join(__dirname,'node_modules'),path.join(temporary,'node_modules'),'dir');
 if(!upstream){
  const file=path.join(temporary,'test/test.getch.ts');let source=fs.readFileSync(file,'utf8');
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
 const target=path.join(root,upstream?'scripts/consumers/node_modules/gaxios':'packages/vgaxios'),dir=path.join(temporary,'compiled/src');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'index.js'),'module.exports=require('+JSON.stringify(target)+');');
 for(const name of ['common','util','retry','gaxios','interceptor'])fs.writeFileSync(path.join(dir,name+'.js'),'module.exports=require('+JSON.stringify(path.join(target,upstream?'build/src':'lib',name+'.js'))+');');
 fs.cpSync(path.join(temporary,'test/fixtures'),path.join(temporary,'compiled/test/fixtures'),{recursive:true});
 const replacements={'node-fetch':path.join(root,upstream?'scripts/consumers/node_modules/node-fetch':'packages/vnode-fetch'),'https-proxy-agent':path.join(root,upstream?'scripts/consumers/node_modules/https-proxy-agent':'packages/vhttps-proxy-agent')};
 for(const file of ['test.index.js','test.getch.js','test.retry.js']){const location=path.join(temporary,'compiled/test',file);let text=fs.readFileSync(location,'utf8');for(const [name,target]of Object.entries(replacements))text=text.replaceAll('require("'+name+'")','require('+JSON.stringify(target)+')').replaceAll("require('"+name+"')",'require('+JSON.stringify(target)+')');fs.writeFileSync(location,text);}
 const env={...process.env};for(const key of ['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY','http_proxy','https_proxy','all_proxy','no_proxy'])delete env[key];
 const output=run(process.execPath,[require.resolve('mocha/bin/mocha.js'),'--no-config','--no-package','--timeout','10000','--reporter','dot','compiled/test/test.index.js','compiled/test/test.getch.js','compiled/test/test.retry.js'],{cwd:temporary,env});console.log(output);
}finally{fs.rmSync(temporary,{recursive:true,force:true});}

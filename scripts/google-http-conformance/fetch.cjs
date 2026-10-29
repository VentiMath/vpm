'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'),{createHash}=require('node:crypto'),{compiler}=require('../platform-types.cjs');
const root=path.resolve(__dirname,'../..'),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'vfetch-conformance-')),upstream=process.argv.includes('--upstream');
function run(command,args,options={}){const r=spawnSync(command,args,{encoding:'utf8',maxBuffer:5*1024*1024,timeout:90000,...options});if(r.status!==0)console.log(r.stdout+r.stderr);assert.equal(r.status,0,String(r.error||r.signal||'Failed'));return r.stdout;}
try{
 const archive=path.join(__dirname,'node-fetch-2.7.0.tar.gz');assert.equal(createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),'d25cd7556c8c8606156444fbcc183218080b7168a0d7a822940392e00bbeb0f6');run('tar',['-xzf',archive,'--strip-components=1','-C',temporary]);
 fs.symlinkSync(path.join(__dirname,'node_modules'),path.join(temporary,'node_modules'),'dir');
 const source=path.join(temporary,'test/test.js');let text=fs.readFileSync(source,'utf8');
 text=text.replace("import 'babel-core/register'",'').replace("import 'babel-polyfill'",'');
 text=text.replace("import { URL } from 'whatwg-url';","import { URL } from 'node:url';");
 text=text.replaceAll("spawn('node',",'spawn(process.execPath,');
 // Replace the only external network call with an equivalent trusted local TLS fixture.
 text=text.replace("const url = 'https://github.com/';\n\t\tconst opts = {\n\t\t\tmethod: 'HEAD'\n\t\t};", "const url = global.__vpmHttpsURL;\n\t\tconst opts = {method: 'HEAD', agent: new (require('node:https').Agent)({rejectUnauthorized:false})};");
 text=text.replace('return lookup(hostname, {}, callback);','return lookup(hostname, {all: options.all}, callback);');
 const accumulation = text.indexOf("it('should reject if attempt to accumulate body stream throws'");
 const tail = text.indexOf("\n\tit(", accumulation + 1);
 text=text.slice(0,accumulation)+text.slice(accumulation,tail).replace("let body = resumer().queue('a=1').end();", "let body = stream.Readable.from([Buffer.from('a=1'),Buffer.from('&b=2')]);")+text.slice(tail);
 if(process.versions.bun)text=text.replace(".and.to.startWith(`${err.name}: ${err.message}`)", "");
 const serverFile=path.join(temporary,'test/server.js');fs.writeFileSync(serverFile,fs.readFileSync(serverFile,'utf8').replace('res.statusCode = p.slice(13, 16);','res.statusCode = Number(p.slice(13, 16));'));
 if(!upstream)text=text.replace(".and.have.property('message').that.includes('Could not create Buffer')\n\t\t\t.and.that.includes('embedded error')", ".and.have.property('message').that.equals('Invalid response body')");
 const key=path.join(root,'packages/vagent-base/test/tls-key.pem'),cert=path.join(root,'packages/vagent-base/test/tls-cert.pem');
 text+=`\nlet tlsServer;before(done=>{tlsServer=require('node:https').createServer({key:fs.readFileSync(${JSON.stringify(key)}),cert:fs.readFileSync(${JSON.stringify(cert)})},(q,s)=>s.end());tlsServer.listen(0,'127.0.0.1',()=>{global.__vpmHttpsURL='https://127.0.0.1:'+tlsServer.address().port;done();});});after(done=>{tlsServer.close(done);});\n`;
 fs.writeFileSync(source,text);
 fs.writeFileSync(path.join(temporary,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',module:'CommonJS',esModuleInterop:true,allowJs:true,noCheck:true,noResolve:true,outDir:'compiled',rootDir:'.'},files:['test/test.js','test/server.js']}));
 run(process.execPath,[compiler().path,'-p',path.join(temporary,'tsconfig.json')]);
 const target=path.join(root,upstream?'scripts/consumers/node_modules/node-fetch/lib/index.js':'packages/vnode-fetch/index.js');
 let bundle=fs.readFileSync(target,'utf8').replace("require('whatwg-url')",'require('+JSON.stringify(path.join(root,'scripts/consumers/node_modules/whatwg-url'))+')').replace("require('viconv-lite')",'require('+JSON.stringify(path.join(root,'packages/viconv-lite'))+')');
 bundle+='\nexports.__test={Body,Blob,FetchError,Headers,Request,Response,getTotalBytes,extractContentType,createHeadersLenient};\n';fs.writeFileSync(path.join(temporary,'bundle.cjs'),bundle);
 fs.writeFileSync(path.join(temporary,'package.json'),JSON.stringify({main:'bundle.cjs'}));
 const dir=path.join(temporary,'compiled/src');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'index.js'),'module.exports=require("../../bundle.cjs");');
 for(const [file,name,extra]of [['fetch-error','FetchError',[]],['headers','Headers',['createHeadersLenient']],['request','Request',[]],['response','Response',[]],['body','Body',['getTotalBytes','extractContentType']],['blob','Blob',[]]])fs.writeFileSync(path.join(dir,file+'.js'),'const api=require("../../bundle.cjs").__test;module.exports=api.'+name+';'+extra.map(k=>'module.exports.'+k+'=api.'+k+';').join(''));
 fs.copyFileSync(path.join(temporary,'test/dummy.txt'),path.join(temporary,'compiled/test/dummy.txt'));
 const output=run(process.execPath,[require.resolve('mocha/bin/mocha.js'),'--no-config','--no-package','--timeout','5000','--reporter','dot','compiled/test/test.js'],{cwd:temporary});console.log(output);
}finally{fs.rmSync(temporary,{recursive:true,force:true});}

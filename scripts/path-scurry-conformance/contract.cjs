'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const own=require(process.env.VPM_PATH_SCURRY_PACKAGE||'../../packages/vpath-scurry');
const controls=[require('path-scurry'),require('path-scurry-app')];
const cwd=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'vpath-contract-')));
let checks=0;
const equal=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const shape=n=>({full:n.fullpath(),posix:n.fullpathPosix(),relative:n.relative(),relativePosix:n.relativePosix(),depth:n.depth(),name:n.name,parent:n.parentPath,type:n.getType(),missing:n.isENOENT(),read:n.canReaddir(),link:n.canReadlink()});
const norm=rows=>rows.map(n=>typeof n==='string'?n:n.fullpath()).sort();
(async()=>{try{
 for(let i=0;i<35;i++){fs.mkdirSync(cwd+`/dir${i%5}`,{recursive:true});fs.writeFileSync(cwd+`/dir${i%5}/file${i}.txt`,'x');}
 fs.symlinkSync('dir1',cwd+'/link');fs.symlinkSync('..',cwd+'/dir2/cycle');fs.symlinkSync('absent',cwd+'/broken');fs.writeFileSync(cwd+'/Écho','unicode');
 for(const control of controls){
  for(const C of ['PathScurryPosix','PathScurryDarwin','PathScurryWin32'])for(const nocase of [true,false]){
   const base=C.endsWith('Win32')?'C:\\base\\here':'/base/here';const a=new control[C](base,{nocase}),b=new own[C](base,{nocase});
   const parts=['Alpha','Beta','écho','e\u0301cho','File.TS','..','.','','one/two'];let seed=7;
   for(let i=0;i<2500;i++){
    const p=[];for(let j=0;j<1+i%5;j++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;p.push(parts[seed%parts.length]);}
    const query=p.join('/');
    // v3 deliberately resolves drive-relative roots against the current drive.
    if(control===controls[1] && C.endsWith('Win32') && query.startsWith('/')) continue;
    equal(shape(b.cwd.resolve(query)),shape(a.cwd.resolve(query)),query+' '+C+' '+nocase);
    equal(b.resolve(...p),a.resolve(...p),'resolve '+query);
   }
  }
  for(const opts of [{},{follow:true},{withFileTypes:false},{filter:n=>n.name.endsWith('.txt')},{walkFilter:n=>n.name!=='dir2'},{follow:true,walkFilter:n=>n.name!=='dir1'},{follow:true,filter:n=>!n.name.startsWith('dir')}]){
   const a=new control.PathScurry(cwd),b=new own.PathScurry(cwd),expected=norm(a.walkSync(opts));
   equal(norm(b.walkSync(opts)),expected,'walkSync');equal(norm(await b.walk(opts)),expected,'walk');equal(norm(await b.stream(opts).collect()),expected,'stream');equal(norm(await b.streamSync(opts).collect()),expected,'streamSync');
  }
  for(const name of ['', 'dir1','dir1/file1.txt','link','link/file1.txt','broken','absent','dir1/absent','dir1/file1.txt/child']){
   const a=new control.PathScurry(cwd),b=new own.PathScurry(cwd);
   for(const method of ['lstatSync','readlinkSync','realpathSync']){
    const expected=a[method](name),actual=b[method](name);equal(typeof actual==='object'?shape(actual):actual,typeof expected==='object'?shape(expected):expected,method+name);
   }
   equal(b.readdirSync(name,{withFileTypes:false}),a.readdirSync(name,{withFileTypes:false}),'readdir'+name);
  }
 }
 const latest=controls[0];for(const query of ['/','/file','\\\\?\\C:\\a','\\\\?\\UNC\\host\\share\\x','\\\\host\\share','\\\\host\\share\\','d:\\folder','../x']){
  const a=new latest.PathScurryWin32('c:\\base'),b=new own.PathScurryWin32('c:\\base');equal(shape(b.cwd.resolve(query)),shape(a.cwd.resolve(query)),'Windows3 '+query);
 }
 console.log(`${checks} differential checks against path-scurry 3.0.0 and app 2.0.2 pass.`);
}finally{fs.rmSync(cwd,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});

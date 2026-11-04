'use strict';
const {spawn}=require('node:child_process'),fs=require('node:fs/promises'),path=require('node:path');
async function waitForPort(child,file,{timeout=30000,interval=25}={}){
 let stderr='',failure;
 const capture=data=>{stderr=(stderr+data).slice(-8192)};
 const error=err=>{failure=err.message};
 const exit=(code,signal)=>{failure='Chrome exited ('+(signal||code)+')'};
 child.stderr?.on('data',capture);child.on('error',error);child.on('exit',exit);
 const deadline=Date.now()+timeout;
 try{
  while(Date.now()<deadline){
   if(failure||child.exitCode!==null||child.signalCode)throw Error(failure||'Chrome exited before readiness');
   let content='';try{content=await fs.readFile(file,'utf8')}catch(err){if(err.code!=='ENOENT')throw err}
   const [port,endpoint]=content.trim().split(/\r?\n/);
   if(/^\d+$/.test(port)&&+port>0&&+port<65536&&endpoint?.startsWith('/devtools/browser/'))return +port;
   await new Promise(r=>setTimeout(r,interval));
  }
  throw Error('Chrome debugging port did not become ready within '+timeout+'ms');
 }catch(err){throw Error(err.message+'\nChrome stderr: '+(stderr.trim()||'(empty)'));}
 finally{child.stderr?.off('data',capture);child.off('error',error);child.off('exit',exit);}
}
async function launch(chrome,profile){
 const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--no-proxy-server','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
 try{return {child,port:await waitForPort(child,path.join(profile,'DevToolsActivePort'))};}
 catch(error){if(child.pid&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill('SIGKILL');await ended;}throw error;}
}
module.exports=launch;module.exports.waitForPort=waitForPort;

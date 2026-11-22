"use strict";
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),assert=require("node:assert/strict");
const app=process.env.VPM_APP_CHECKOUT;
if(!app)throw new Error("Set VPM_APP_CHECKOUT to the app checkout with installed dependencies.");
const candidate=require(path.join(process.env.VPM_TRACE_INSTALL||path.resolve(__dirname,"../../packages"),"vsemver"));
const control=require("./node_modules/semver-app");
const file=path.join(app,"node_modules/@capacitor/cli/dist/common.js"),text=fs.readFileSync(file,"utf8");
const start=text.indexOf("async function checkPlatformVersions("),end=text.indexOf("exports.checkPlatformVersions",start);
assert.ok(start>=0&&end>start);
async function compare(s,core,platform){
 const warnings=[],colors={strong:x=>x,weak:x=>x,input:x=>x};
 const fn=vm.compileFunction(text.slice(start,end)+";return checkPlatformVersions;",["require","tslib_1","getCoreVersion","getCapacitorPackageVersion","log_1","colors_1"])(
  name=>{assert.equal(name,"semver");return s},{__importStar:x=>x},async()=>core,async()=>platform,{logger:{warn:message=>warnings.push(message)}},{default:colors});
 await fn({},"ios");return warnings;
}
(async()=>{
 for(const [core,platform] of [["8.2.0","8.2.0"],["8.2.0","8.3.0"],["8.2.0","9.0.0"],["8.2.0","8.2.1"],["8.2.0-beta.1","8.2.0"]]){
  assert.deepEqual(await compare(candidate,core,platform),await compare(control,core,platform));
 }
 for(const name of ["asymmetricKeyDetailsSupported","rsaPssKeyDetailsSupported","psSupported"]){
  const source=fs.readFileSync(path.join(app,"node_modules/jsonwebtoken/lib",name+".js"),"utf8");
  const run=s=>{const module={exports:{}};vm.compileFunction(source,["module","exports","require","process"])(module,module.exports,n=>{assert.equal(n,"semver");return s},process);return module.exports};
  assert.equal(run(candidate),run(control));
 }
 console.log("Installed Capacitor warning logic and jsonwebtoken runtime gates match the app control.");
})().catch(e=>{console.error(e);process.exitCode=1});

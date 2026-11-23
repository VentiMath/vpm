'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto');
const {root,control,context,loadWsl,stack,loadModule}=require('./load.cjs');
const current=control('is-wsl'),container=control('is-inside-container'),docker4=control('is-docker-current');
const vpmDir=process.env.VPM_WSL_PACKAGE||path.join(root,'packages/vis-wsl');
const vpm=path.join(vpmDir,'index.cjs');
const insideFile=require.resolve('vis-inside-container',{paths:[vpmDir]});
const dockerFile=require.resolve('vis-docker',{paths:[path.dirname(insideFile)]});
let compared=0;
for(const platform of ['linux','darwin','win32','freebsd'])
for(const release of ['6.12','Microsoft','5.15-MICROSOFT-standard'])
for(const proc of [undefined,'Linux','microsoft',new Error('EACCES')])
for(const markers of [[],['/proc/sys/fs/binfmt_misc/WSLInterop'],['/run/WSL'],['/run/WSL','/proc/sys/fs/binfmt_misc/WSLInterop']])
for(const inside of [false,true]) {
  const entries={'/proc/version':proc,...Object.fromEntries(markers.map(file=>[file,'']))};
  const run=file=>{const ctx=context({platform,release,entries});let calls=0;const result=loadWsl(file,ctx,()=>{calls++;return inside});return {result,calls,probes:ctx.calls}};
  const actual=run(vpm);assert.deepEqual(actual,run(current));
  const evidence=release.toLowerCase().includes('microsoft')||proc==='microsoft'||markers.length>0;
  assert.equal(actual.result,platform==='linux'&&Boolean(evidence)&&!inside);compared++;
}
// Each caller is loaded unchanged. Hashes make changes to fixture code visible.
const openFile=path.join(__dirname,'node_modules/open/index.js');
const legacy=path.join(__dirname,'node_modules/is-wsl-app/index.js');
const hashes=require('./wsl-callers.json');
for(const [file,hash] of Object.entries(hashes.sha256)) assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname,'node_modules',file))).digest('hex'),hash);
async function opened(scenario,version) {
  const ctx=context(scenario);
  const options=version==='vpm'?{wslFile:vpm,containerFile:insideFile,dockerFile}:version==='current'?{wslFile:current,containerFile:container,dockerFile:docker4}:{wslFile:legacy,containerFile:container,dockerFile:require.resolve('is-docker',{paths:[path.dirname(legacy)]})};
  const state=stack(ctx,options); const launches=[];
  const open=loadModule(openFile,{
    'is-wsl':state.wsl,'is-docker':state.docker,
    fs:{constants:fs.constants,promises:{access:async()=>{throw new Error('missing')},readFile:async()=>{throw new Error('unexpected read')}}},
    child_process:{spawn(command,args,options){launches.push({command,args:[...args],options});return {unref(){launches.push('unref')}}}},
  },ctx.process);
  await open('https://ventimath.org/');
  return JSON.parse(JSON.stringify({isWsl:state.wsl,launches}));
}
(async()=>{
  let upgrades=0;
  const scenarios=[
    {name:'macOS',platform:'darwin'}, {name:'Windows',platform:'win32'}, {name:'Linux'},
    {name:'WSL1',release:'Microsoft'}, {name:'WSL2',entries:{'/proc/version':'microsoft-standard'}},
    {name:'custom interop',entries:{'/proc/sys/fs/binfmt_misc/WSLInterop':''}},
    {name:'custom run path',entries:{'/run/WSL':''}},
    {name:'Podman on WSL',release:'Microsoft',entries:{'/run/.containerenv':''}},
    {name:'Docker on WSL',release:'Microsoft',entries:{'/.dockerenv':''}},
    {name:'Docker cgroup on WSL',release:'Microsoft',entries:{'/proc/self/cgroup':'docker-id'}},
    {name:'Docker mountinfo on WSL',release:'Microsoft',entries:{'/proc/self/mountinfo':'/docker/containers/id/hosts'}},
    {name:'Podman custom kernel',entries:{'/run/.containerenv':'','/run/WSL':''}},
    {name:'restricted Linux',entries:{'/proc/version':new Error('EACCES')}},
  ];
  for(const scenario of scenarios) {
    const actual=await opened(scenario,'vpm');assert.deepEqual(actual,await opened(scenario,'current'),scenario.name);
    const old=await opened(scenario,'legacy');
    if(actual.isWsl!==old.isWsl) {
      assert(['custom interop','custom run path','Podman on WSL','Docker mountinfo on WSL'].includes(scenario.name));
      assert.equal(actual.launches[0].command,actual.isWsl?'/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe':'xdg-open');upgrades++;
    } else assert.deepEqual(actual,old,scenario.name);
    assert.equal(actual.launches.length,2);
  }
  assert.equal(upgrades,4);
  console.log(`${compared} current WSL contracts and ${scenarios.length} unchanged opener scenarios pass; ${upgrades} documented upgrades from the installed 2.2.0 caller. Launches intercepted.`);
})().catch(error=>{console.error(error);process.exitCode=1});

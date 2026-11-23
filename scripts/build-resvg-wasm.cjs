'use strict';
// Build our C source only. wasi-sdk supplies clang/lld, never renderer code.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),check=process.argv.includes('--check');
const releases={
 'darwin-arm64':['wasi-sdk-34.0-arm64-macos','9c59398106b417f8f14913380fdf0097a8cc0ff4af9eb3ce0065a859e88d49e9'],
 'linux-x64':['wasi-sdk-34.0-x86_64-linux','b761e3a0721dbae9c09a0059e5fdb2bf917d1b4a8a7b430fb3b5aafb0984b2c4'],
};
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vresvg-compile-'));
try{
 let sdk=process.env.VPM_WASI_SDK;
 if(!sdk){
  assert(process.argv.includes('--download'),'Set VPM_WASI_SDK or pass --download to fetch the checksum-pinned development compiler');
  const release=releases[process.platform+'-'+process.arch];assert(release,'Use VPM_WASI_SDK on this host');
  const [name,digest]=release,archive=path.join(temp,'sdk.tgz');
  execFileSync('curl',['--fail','--location','--silent','--show-error','https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-34/'+name+'.tar.gz','-o',archive]);
  assert.equal(createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),digest);
  execFileSync('tar',['-xzf',archive,'-C',temp]);sdk=path.join(temp,name);
 }
 const output=path.join(temp,'scan.wasm');
 execFileSync(path.join(sdk,'bin/clang'),['packages/vresvg/src/scan.c','--target=wasm32','-O3','-msimd128','-nostdlib','-fno-builtin','-ffp-contract=off','-Wl,--no-entry','-Wl,--import-memory','-Wl,--export=__heap_base','-Wl,-z,stack-size=65536','-Wl,--initial-memory=131072','-Wl,--max-memory=268435456','-o',output],{cwd:root,stdio:'inherit'});
 const bytes=fs.readFileSync(output),target=path.join(root,'packages/vresvg/scan.wasm');
 const mod=new WebAssembly.Module(bytes);assert.deepEqual(WebAssembly.Module.imports(mod),[{module:'env',name:'memory',kind:'memory'}]);
 if(check)assert.deepEqual(bytes,fs.readFileSync(target),'Committed scanner differs from its reproducible C build');else {fs.writeFileSync(target,bytes);fs.chmodSync(target,0o644);}
 console.log((check?'Verified':'Built')+' owned scanner: '+bytes.length+' bytes; SHA256 '+createHash('sha256').update(bytes).digest('hex'));
}finally{fs.rmSync(temp,{recursive:true,force:true});}

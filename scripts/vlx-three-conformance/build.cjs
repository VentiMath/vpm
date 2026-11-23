'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),out=path.resolve(process.argv[2]||'/private/tmp/vlx-three.html'),version=process.argv[3]||'three';
if(!['three','three-app'].includes(version))throw Error('Unknown Three.js control');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vlx-three-build-'));
try{
 const dep=path.join(__dirname,'node_modules',version);
 let source=fs.readFileSync(root+'/examples/vlx-three/main.mjs','utf8');
 const controls=fs.readFileSync(dep+'/examples/jsm/controls/OrbitControls.js','utf8').replace("from 'three'","from "+JSON.stringify(dep+'/build/three.module.js'));
 fs.writeFileSync(tmp+'/controls.mjs',controls);
 source=source.replace("from 'three'","from "+JSON.stringify(dep+'/build/three.module.js')).replace("from 'three/addons/controls/OrbitControls.js'","from "+JSON.stringify(tmp+'/controls.mjs'));
 source=source.replace(/from '(\.\.?\/[^']+)'/g,(_,file)=>'from '+JSON.stringify(path.resolve(root+'/examples/vlx-three',file)));
 fs.writeFileSync(tmp+'/entry.mjs',source);
 execFileSync('bun',['build',tmp+'/entry.mjs','--target=browser','--minify','--outfile='+tmp+'/bundle.js'],{cwd:root,stdio:'pipe'});
 const notices=['Three.js: '+fs.readFileSync(dep+'/LICENSE','utf8'),fs.readFileSync(root+'/packages/vlx/font/NOTICE','utf8'),fs.readFileSync(root+'/packages/vlx/font/LICENSE','utf8')].join('\n');
 const html='<!-- '+notices.replaceAll('-->','-- >')+' -->\n'+fs.readFileSync(root+'/examples/vlx-three/index.html','utf8').replace('<!-- BUNDLE -->',()=>'<script type="module">'+fs.readFileSync(tmp+'/bundle.js','utf8').replace(/<\/script/gi,'<\\/script')+'</script>');
 fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,html);console.log(out);
}finally{fs.rmSync(tmp,{recursive:true,force:true});}

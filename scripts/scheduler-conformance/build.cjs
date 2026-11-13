'use strict';
const path=require('node:path'),fs=require('node:fs'),esbuild=require('esbuild');
const out=path.join(__dirname,'node_modules/.vpm-scheduler');fs.mkdirSync(out,{recursive:true});
for(const kind of ['upstream','vpm']) esbuild.buildSync({
 entryPoints:[path.join(__dirname,'browser-entry.jsx')],bundle:true,format:'iife',platform:'browser',
 outfile:path.join(out,kind+'.js'),
 define:{'process.env.NODE_ENV':JSON.stringify(process.env.VPM_REACT_MODE||'production')},
 alias:{scheduler:path.join(__dirname,'instrument.cjs'),'@scheduler-runtime':kind==='upstream'?require.resolve('scheduler'):process.env.VPM_SCHEDULER_ENTRY||path.resolve(__dirname,'../../packages/vscheduler/index.cjs')},
});
console.log('Built unchanged React 19.3.1 with upstream and VPM scheduling');

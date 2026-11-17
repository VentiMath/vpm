'use strict';
const path=require('node:path'),fs=require('node:fs'),{createRequire}=require('node:module');const peer=createRequire(__dirname+'/package.json'),esbuild=peer('esbuild'),base=__dirname+'/node_modules/.vpm-idb';fs.mkdirSync(base,{recursive:true});
for(const [name,target]of [['current',peer.resolve('idb')],['app',peer.resolve('idb-app/with-async-ittr')],['vpm',process.env.VPM_IDB_ENTRY||path.resolve(__dirname,'../../packages/vidb/index.cjs')]])esbuild.buildSync({entryPoints:[__dirname+'/browser-entry.js'],bundle:true,format:'iife',platform:'browser',outfile:base+'/'+name+'.js',alias:{'@idb':target,idb:target},logLevel:'silent'});
esbuild.stop();module.exports=base;console.log('Built native IndexedDB and unchanged Firebase fixtures');

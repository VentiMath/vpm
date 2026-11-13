"use strict";
const fs=require('node:fs'),path=require('node:path');
const {compile,clean}=require('../platform-types.cjs'),root=path.resolve(__dirname,'../..');
const dir=process.argv[2]||__dirname,packages=process.argv[2]?dir+'/node_modules':root+'/packages';
for(const bundler of [false,true]){
 const paths={};
 if(!process.argv[2]){for(const name of fs.readdirSync(packages)){const p=packages+'/'+name,meta=require(p+'/package.json');if(meta.types)paths[name]=[p+'/'+meta.types];}paths['vmotion/react']=[packages+'/vmotion/react.d.mts'];paths.react=[root+'/scripts/mui-system-conformance/node_modules/@types/react/index.d.ts'];paths.csstype=[root+'/scripts/mui-system-conformance/node_modules/csstype/index.d.ts'];}
 const result=compile({compilerOptions:{strict:true,noEmit:true,skipLibCheck:false,target:'ES2022',lib:['ES2022','DOM','DOM.Iterable'],module:bundler?'ESNext':'NodeNext',moduleResolution:bundler?'Bundler':'NodeNext',types:[],paths},files:[dir+'/consumer.mts',...(bundler?[]:[dir+'/consumer.cts'])]});
 if(result.status){console.error(result.output);process.exit(1);}clean(result);
}
console.log('Motion React TS7 NodeNext/Bundler native roots, refs, variants and controllers pass');

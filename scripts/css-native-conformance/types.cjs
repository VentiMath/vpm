'use strict';
const path=require('node:path'),{compile,clean}=require('../platform-types.cjs'),dir=process.argv[2]||__dirname;
for(const bundler of [false,true])for(const ext of bundler?['mts']:['mts','cts']){
 const paths=Object.fromEntries(['vpostcss-value-parser','vcss-to-react-native'].map(name=>[name,[path.resolve(__dirname,'../../packages',name,'index.d.'+ext)]]));
 const r=compile({compilerOptions:{strict:true,noEmit:true,skipLibCheck:false,target:'ES2022',lib:['ES2022'],module:bundler?'ESNext':'NodeNext',moduleResolution:bundler?'Bundler':'NodeNext',types:[],...(!process.argv[2]?{paths}:{})},files:[dir+'/consumer.'+ext]});
 if(r.status){console.error(r.output);process.exit(1)}clean(r);
}console.log('Strict TS7 CSS parser/converter consumers pass NodeNext/Bundler');

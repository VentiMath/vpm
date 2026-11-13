'use strict';
const path=require('node:path');const {compile,clean}=require('../platform-types.cjs');
const directory=process.argv[2]||__dirname;
for(const bundler of [false,true]){
 const r=compile({compilerOptions:{strict:true,noEmit:true,skipLibCheck:false,target:'ES2022',lib:['ES2022'],types:[],module:bundler?'ESNext':'NodeNext',moduleResolution:bundler?'Bundler':'NodeNext',...(!process.argv[2]?{paths:{vscheduler:[path.resolve(__dirname,'../../packages/vscheduler/index.d.ts')]}}:{})},files:[directory+'/consumer.mts',...(bundler?[]:[directory+'/consumer.cts'])]});clean(r);
}
console.log('Strict TS7 scheduler consumers pass NodeNext and Bundler without platform globals');

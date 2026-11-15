'use strict';
const path=require('node:path'),{compile,clean}=require('../platform-types.cjs'),dir=process.argv[2]||__dirname;
for(const bundler of [false,true])clean(compile({compilerOptions:{strict:true,noEmit:true,skipLibCheck:false,target:'ES2022',lib:['ES2022'],types:[],module:bundler?'ESNext':'NodeNext',moduleResolution:bundler?'Bundler':'NodeNext',...(!process.argv[2]?{paths:{vreselect:[path.resolve(__dirname,'../../packages/vreselect/index.d.'+(bundler?'mts':'cts'))]}}:{})},files:[dir+'/consumer.mts',...(!bundler?[dir+'/consumer.cts']:[])]}));
console.log('Strict TS7 selector inference, typed state, parameters, outputs and negative consumers pass NodeNext/Bundler');

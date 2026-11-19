'use strict';
const path=require('node:path'),{compile,clean}=require('../platform-types.cjs'),dir=process.argv[2]||__dirname,base=path.resolve(__dirname,'../../packages/vpicocolors');
for(const bundler of [false,true])for(const ext of bundler?['mts']:['mts','cts']){
 const r=compile({compilerOptions:{strict:true,noEmit:true,skipLibCheck:false,target:'ES2022',lib:['ES2022','DOM'],module:bundler?'ESNext':'NodeNext',moduleResolution:bundler?'Bundler':'NodeNext',types:[],...(!process.argv[2]?{paths:{vpicocolors:[base+'/index.d.'+ext]}}:{})},files:[dir+'/consumer.'+ext]});
 if(r.status){console.error(r.output.split('\n').filter(l=>!l.startsWith('/')).join('\n'));process.exit(1)}clean(r);
}
console.log('Strict TS7 terminal color consumers pass NodeNext/Bundler');

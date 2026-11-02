'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
for(const runtime of ['node','bun']){
 const report=JSON.parse(fs.readFileSync(path.join(__dirname,'rewrite-results',runtime+'.json')));
 console.log(runtime);console.table(require('../../../scripts/bench-process.cjs').verify(report,process.argv.includes('--verify-current')?root:undefined));
}

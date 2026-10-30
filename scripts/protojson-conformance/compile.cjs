'use strict';
const fs=require('node:fs'),path=require('node:path');
const out=process.argv[2],source=path.join(__dirname,'upstream/typescript/test/unit');
const result=await Bun.build({entrypoints:fs.readdirSync(source).filter(f=>f.endsWith('.ts')).map(f=>path.join(source,f)),outdir:path.join(out,'build/test/unit'),root:source,target:'node',format:'cjs',external:['*']});
if(!result.success)throw new AggregateError(result.logs,'Upstream test compilation failed');

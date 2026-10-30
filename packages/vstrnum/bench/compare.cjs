'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const upstream=(await import('../../../scripts/numbers-conformance/node_modules/strnum/strnum.js')).default,vpm=require('..');
 const values=prefix=>Array.from({length:64},(_,i)=>prefix+i);
 const inputs=[['short integers',values('123')],['XML default options',values('123'),{hex:true,leadingZeros:true,eNotation:true}],['non-numeric XML values',values('upload-id-')],['decimal with trailing zeros',Array.from({length:64},(_,i)=>' 0'+i+'.2500 ')],['scientific notation',Array.from({length:64},(_,i)=>i+'.25e-2')],['hex binary octal',['0xff','-0x1abc','0b111001','0o755'],{hex:true,binary:true,octal:true}],['precision-preserving rejection',values('9007199254740993')],['Unicode normalization',Array.from({length:64},(_,i)=>'−१२३.५'+i),{unicode:true}],['skip pattern',values('+121212'),{skipLike:/^\+\d+$/}],['overflow handling',values('1e999'),{infinity:'null'}],['long decimal 4KiB',values('0.'+'0'.repeat(4000))]];
 const cases=inputs.map(([name,values,options])=>{const expected=new Set(values.map(v=>upstream(v,options)));return{name,make:lib=>{let i=0;return()=>lib(values[i++%values.length],options);},validate:value=>assert.ok(expected.has(value))};});
 await require('../../../scripts/bench-paired.cjs').run({root:path.resolve(__dirname,'..'),upstream,vpm,cases,files:['index.js','../vanynum/index.js','../vanynum/lib/data.js','bench/compare.cjs','../../scripts/numbers-conformance/upstream/SHA256.json']});
})().catch(e=>{console.error(e);process.exitCode=1;});

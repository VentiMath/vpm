import {longhandPng,longhandSvg} from './writeupPicture';
import {writeFileSync} from 'node:fs';
const glyph={t:'g' as const,s:[[0,0,4,9,8,0],[3,3,3,3]],w:8,h:9,p:null,dy:0,gap:0,dx:0,k:1,lv:0,fl:0};
const fixtures=[];
for(const tidy of [false,true])for(const line of ['s','m','l'] as const)for(const lines of [1,8,100]) {
const page={app:'trackpad-longhand' as const,v:1 as const,u:.009,frozen:true,page:{width:1100,line,size:1,tidy},items:Array.from({length:lines},()=>[...Array.from({length:12},()=>glyph),{t:'n' as const}]).flat()};
const drawn=longhandSvg(page)!;const fitTo=drawn.height/drawn.width*1200>4800?{mode:'height',value:4800}:{mode:'width',value:1200};
const image=await longhandPng(page);if(!image||image.readUInt32BE(16)>1200||image.readUInt32BE(20)>4800)throw Error('bad image dimensions');
fixtures.push({name:`unchanged caller ${tidy} ${line} ${lines}`,svg:drawn.svg,fitTo});
}
writeFileSync('fixtures.json',JSON.stringify(fixtures));console.log('Unchanged writeupPicture.ts: 18 raw/tidy/ruling/tall page calls pass');

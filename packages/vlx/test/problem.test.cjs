'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {renderProblemSvg,renderProblemPng,pngSize}=require('../../../scripts/vlx-conformance/load.cjs')('problem');
const {createRequire}=require('node:module'),path=require('node:path');
const fixture=createRequire(path.resolve(__dirname,'../../../scripts/vlx-conformance/package.json'));
const {Resvg}=fixture('@resvg/resvg-js'),{PNG}=require('../../vpngjs');
const picture=(w,h,color='red')=>new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${color}"/></svg>`).render().asPng();
function bounds(png,color){let left=png.width,right=-1,top=png.height,bottom=-1,count=0;for(let y=0;y<png.height;y++)for(let x=0;x<png.width;x++){const i=(y*png.width+x)*4;if(color.every((v,c)=>png.data[i+c]===v)){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);count++;}}return {left,right,top,bottom,count};}
const decoded=p=>PNG.sync.read(renderProblemPng(p));
test('page layout joins adjacent text parts, preserves math whitespace and bounds width',()=>{
 const statement=String.raw`Calculate $x^2+2x+1$.`;
 const whole=renderProblemPng({statement});assert.ok(Buffer.isBuffer(whole));
 assert.deepEqual(whole,renderProblemPng({statement:'ignored',statementParts:[{kind:'text',text:statement.slice(0,13)},{kind:'text',text:statement.slice(13)}]}));
 assert.deepEqual(renderProblemPng({statement:'Value $x  \n +1$.'}),renderProblemPng({statement:'Value $x +1$.'}));
 assert.equal(pngSize(whole).width,960);
 assert.ok(pngSize(renderProblemPng({statement:'First.  \nSecond.\n\nThird.'})).height>pngSize(renderProblemPng({statement:'First. Second. Third.'})).height);
 const page=renderProblemSvg({statement:'Literal <script> and \\ ^ ~.'});assert.doesNotMatch(page.svg,/<script>|<text\b|foreignObject/);assert.match(page.svg,/<path/);
});
test('inline images share a baseline, block images center and large figures fit',()=>{
 const first={png:picture(40,60),width:40},second={png:picture(60,20,'blue'),width:60};
 const p=decoded({statement:'ignored',statementParts:[{kind:'text',text:'Before '},{kind:'image',figure:first},{kind:'text',text:' between '},{kind:'image',figure:second},{kind:'image',display:'block',figure:{png:picture(200,100,'lime'),width:2000}}]});
 const a=bounds(p,[255,0,0]),b=bounds(p,[0,0,255]),c=bounds(p,[0,255,0]);assert.ok(a.count>1000);assert.ok(b.left>a.right);assert.ok(Math.abs(a.bottom-b.bottom)<=1);assert.ok(c.top>b.bottom);assert.equal(c.left,36);assert.equal(c.right,923);assert.ok(Math.abs((c.right-c.left+1)/(c.bottom-c.top+1)-2)<.01);
});
test('choice figures override placeholders, retain size, order, labels and rows',()=>{
 const colors=['red','lime','blue','yellow','magenta'],figures=Object.fromEntries([... 'EDCBA'].map(k=>[k,{png:picture(160,132,colors[k.charCodeAt(0)-65]),width:160}]));
 const p={statement:'Select.',optionFigures:figures};const bytes=renderProblemPng(p);
 assert.deepEqual(bytes,renderProblemPng({...p,options:{A:String.raw`\unknownPlaceholder`}}));
 const png=PNG.sync.read(bytes),boxes=[[255,0,0],[0,255,0],[0,0,255],[255,255,0],[255,0,255]].map(c=>bounds(png,c));
 boxes.forEach((b,i)=>{assert.ok(b.right-b.left>=278);assert.ok(b.bottom-b.top>=229);assert.ok(b.left>=36&&b.right<924);if(i<3)assert.equal(b.top,boxes[0].top);else assert.equal(b.top,boxes[3].top);});assert.ok(boxes[3].top>boxes[2].bottom);
 const labeled={statement:'',optionFigures:{A:{...figures.A,includesChoiceLabel:true}}};assert.ok(pngSize(renderProblemPng(labeled)).height<pngSize(renderProblemPng({statement:'',optionFigures:{A:figures.A}})).height);
});
test('untrusted figures and layout budgets fail before native rendering',()=>{
 const png=picture(40,30),bad=Buffer.from(png);bad[29]^=1;
 for(const bytes of [bad,png.subarray(0,24),new Uint8Array(40)])assert.throws(()=>renderProblemSvg({statement:'',figure:{png:bytes,width:20}}));
 for(const width of [0,-1,NaN,Infinity])assert.throws(()=>renderProblemSvg({statement:'',figure:{png,width}}));
 assert.throws(()=>renderProblemSvg({statement:'x'.repeat(131073)}),{code:'LIMIT'});
 assert.throws(()=>renderProblemSvg({statement:'',options:Object.fromEntries(Array.from({length:65},(_,i)=>[String(i),'1']))}),{code:'LIMIT'});
 assert.throws(()=>renderProblemSvg({statement:'$'+String.raw`\includegraphics{https://example.com}`+'$'}),{code:'TEX'});
 assert.throws(()=>renderProblemSvg({statement:'$unclosed'}),{code:'UNCLOSED_MATH'});
 assert.throws(()=>renderProblemSvg({statement:'',figure:{png:picture(1,500),width:1000}}),{code:'LIMIT'});
});

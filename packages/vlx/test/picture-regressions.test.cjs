'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'),{createRequire}=require('node:module');
const consumer=process.env.VPM_VLX_CONSUMER&&createRequire(path.join(process.env.VPM_VLX_CONSUMER,'package.json'));
const load=consumer?(name='index')=>consumer(name==='index'?'vlx':'vlx/'+name):require('../../../scripts/vlx-conformance/load.cjs');
const {renderProblemSvg}=load('problem'),{renderMath}=load();
const {JSDOM}=require('../../../scripts/vlx-conformance/node_modules/jsdom');
const fonts=require(consumer?path.join(path.dirname(consumer.resolve('vlx/package.json')),'font/glyphs.json'):'../font/glyphs.json');
test('a formula alone in a paragraph receives display sizing, with explicit styles preserved',()=>{
 for(const tex of [String.raw`\frac{1}{2}`,String.raw`\frac{1}{1+\frac{1}{2}}`,String.raw`\tfrac{1}{2}`,String.raw`\textstyle\frac{1}{2}`]){
  assert.deepEqual(renderProblemSvg({statement:'$'+tex+'$'}),renderProblemSvg({statement:'$$'+tex+'$$'}),tex);
  assert.deepEqual(renderProblemSvg({statement:'Before.\n\n$'+tex+'$\n\nAfter.'}),renderProblemSvg({statement:'Before.\n\n$$'+tex+'$$\n\nAfter.'}));
 }
 const display=renderProblemSvg({statement:String.raw`$\frac{1}{2}$`}),inline=renderProblemSvg({statement:String.raw`Value $\frac{1}{2}$.`});
 assert(display.height>inline.height,'An inline fraction stays smaller within a sentence');
});
test('page choice letters are bold while their mathematical values retain their own style',()=>{
 const output=renderProblemSvg({statement:'',options:{A:'A'}}).svg;
 for(const font of ['italic','bold'])assert(output.includes('d="'+fonts.paths[fonts.variants[font].A[4]]+'"'),font+' A outline');
 assert.equal(output.split('d="'+fonts.paths[fonts.variants.bold.A[4]]+'"').length-1,1,'Only the choice label is made bold');
});
test('break-only math advances paragraph flow rather than creating an invisible tall inline box',()=>{
 assert.deepEqual(renderProblemSvg({statement:String.raw`First. $\\$ Second.`}),renderProblemSvg({statement:'First.  \nSecond.'}));
 const one=renderProblemSvg({statement:String.raw`First. $\\$ Second.`});
 const two=renderProblemSvg({statement:String.raw`First. $\\$ $\\$ Second.`});
 assert(two.height-one.height>=38&&two.height-one.height<=40,'Repeated explicit breaks retain one normal empty line');
 assert(renderProblemSvg({statement:String.raw`First. $\\[6pt]$ Second.`}).height>one.height,'Explicit extra gap is retained');
 assert.match(renderMath(String.raw`x\\y`).mathml,/<mtable/,'Breaks within a real formula remain mathematical rows');
});
test('a root degree sits over its radical hook, with correct MathML and bounded dimensions',()=>{
 for(const display of [false,true]){
  const r=renderMath(String.raw`10\sqrt[3]{10}`,{display}),dom=new JSDOM(r.svg),svg=dom.window.document.querySelector('svg');
  const stroke=svg.querySelector('path[stroke]'),siblings=[...stroke.parentElement.children],index=siblings.at(-1),body=siblings.at(-2);
  const position=g=>g.getAttribute('transform').match(/translate\(([-.\d]+) ([-.\d]+)\)/).slice(1).map(Number);
  const hookX=Number(stroke.getAttribute('d').match(/^M ([-.\d]+)/)[1]);
  assert(position(index)[0]>hookX,'Degree begins over the hook, not next to the preceding coefficient');
  assert(position(index)[0]<position(body)[0]);
  assert.match(r.mathml,/<mroot><mrow><mn>10<\/mn><\/mrow><mrow><mn>3<\/mn><\/mrow><\/mroot>/);
  dom.window.close();
 }
 for(const [,tex]of require('../../../scripts/vlx-conformance/picture-corpus.cjs').roots){const r=renderMath(tex);assert(r.width>0&&r.height>0&&r.baseline<=r.height);}
});

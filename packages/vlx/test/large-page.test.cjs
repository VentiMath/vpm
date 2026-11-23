'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{createRequire}=require('node:module'),{createHash}=require('node:crypto');
const consumer=process.env.VPM_VLX_CONSUMER&&createRequire(path.join(process.env.VPM_VLX_CONSUMER,'package.json'));
const {renderProblemSvg,renderProblemPng}=consumer?consumer('vlx/problem'):require('../problem.cjs');
const {PNG}=consumer?consumer('vpngjs'):require('../../vpngjs');
const phrase='Eight distinct synthetic numbers are arranged in a circular row. ';
test('the 9750-character Discord page renders fully without changing its glyph pixels',()=>{
 const problem={statement:phrase.repeat(150)},page=renderProblemSvg(problem);
 assert.equal(problem.statement.length,9750);assert.equal(page.width,960);assert.equal(page.height,5898);assert.equal(page.svg.length,4544192);
 const png=PNG.sync.read(renderProblemPng(problem));assert.equal(png.width,page.width);assert.equal(png.height,page.height);
 // The trusted synthetic 0.3.2 scan-conversion output was inspected with only
 // its obsolete work counter disabled. Shipping code/tests retain all guards.
 assert.equal(createHash('sha256').update(png.data).digest('hex'),'42ac6c2ee301aae6a6803fa1c4acc91451ec2ec1b1aa6339b3091ba1e6619f67');
});
test('a larger ordinary page and equivalent ordered text parts retain their full layout',()=>{
 const statement=phrase.repeat(300),problem={statement},ordered={statementParts:[{kind:'text',text:statement.slice(0,7000)},{kind:'text',text:statement.slice(7000)}]};
 const page=renderProblemSvg(problem);assert.equal(page.height,11736);assert.deepEqual(renderProblemSvg(ordered),page);
 const png=PNG.sync.read(renderProblemPng(ordered));assert.equal(png.width,960);assert.equal(png.height,11736);
 // An empty or truncated lower half must not count as a successful page.
 assert(png.data.subarray((png.height-100)*png.width*4).some((v,i)=>i%4!==3&&v<128));
});
test('26000 characters and the full 8192-item boundary preserve all page pixels',()=>{
 for(const [statement,height,svgLength,digest] of [
  [phrase.repeat(400),15628,12121096,'4b79f2b8ec06e9cd491dffd7374e93d7acfba068a5d8c0ac62b259027c8b2121'],
  [phrase.repeat(409)+'x '.repeat(6),15978,12399185,'a0ef232fcb86eac64b7a00e48ba5316e0bb601673750a68a7d8e6861bc763fdc'],
 ]){
  const page=renderProblemSvg({statement});assert.equal(page.width,960);assert.equal(page.height,height);assert.equal(page.svg.length,svgLength);
  const png=PNG.sync.read(renderProblemPng({statement}));assert.equal(png.width,960);assert.equal(png.height,height);
  // Derived from 0.3.3 with only its cumulative geometry counter reset per
  // path in an isolated reference. No limit is disabled by shipping tests.
  assert.equal(createHash('sha256').update(png.data).digest('hex'),digest);
 }
 assert.throws(()=>renderProblemSvg({statement:phrase.repeat(409)+'x '.repeat(7)}),{code:'LIMIT',message:'Problem has too many layout items'});
});

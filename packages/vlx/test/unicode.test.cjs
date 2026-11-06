'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{createRequire}=require('node:module');
const consumer=process.env.VPM_VLX_CONSUMER&&createRequire(path.join(process.env.VPM_VLX_CONSUMER,'package.json'));
const load=consumer?(name='index')=>consumer(name==='index'?'vlx':'vlx/'+name):require('../../../scripts/vlx-conformance/load.cjs');
const api=load(),{renderProblemSvg}=load('problem');
test('fractions, ordinal letters, accents and custom operators have real outlines and retain their meaning',()=>{
 for(const char of '½¾®Жᵗʰⁿᵈő☺◉¶²³º˚●'){
  const r=api.renderMath('\\text{'+char+'}');assert.match(r.svg,/<path /,char+' must have ink');assert(r.width>0);assert(r.mathml.includes(char),'MathML retains '+char);
  assert.match(renderProblemSvg({statement:'Value '+char+'.'}).svg,/<path /);
 }
 for(const [,tex]of require('../../../scripts/vlx-conformance/unicode-corpus.cjs'))assert.match(api.renderMath(tex).svg,/<svg/);
 assert.notEqual(api.renderMath('\\text{½}').svg,api.renderMath('\\text{¾}').svg);
 assert.notEqual(api.renderMath('\\text{☺}').svg,api.renderMath('\\text{◉}').svg);
});
test('fullwidth punctuation occupies a full em without normalizing stored or semantic text',()=>{
 for(const char of '，：')for(const font of ['text','textbf','textit']){
  const r=api.renderMath('\\'+font+'{'+char+'}'),control=api.renderMath('\\'+font+'{'+(char==='，'?',':':')+'}');
  assert(r.width>control.width);assert.match(r.svg,/<path /);assert(r.mathml.includes(char));
 }
});
test('soft hyphen is invisible when no discretionary break is taken; other missing characters still fail',()=>{
 const a=api.renderMath('\\text{co\u00adoperate}'),b=api.renderMath('\\text{cooperate}');
 const ink=svg=>svg.replace(/<title>[^<]*<\/title>/g,'').replace(/<g[^>]*><\/g>/g,'');
 assert.equal(ink(a.svg),ink(b.svg));assert.equal(a.width,b.width);assert(a.mathml.includes('\u00ad'));
 const page=renderProblemSvg({statement:'co\u00adoperate'}),plain=renderProblemSvg({statement:'cooperate'});assert.equal(ink(page.svg),ink(plain.svg));assert.equal(page.height,plain.height);
 assert.throws(()=>renderProblemSvg({statement:'angle \x02 ABC'}),{code:'UNSUPPORTED_GLYPH'});
 assert.throws(()=>api.renderMath('\\text{\u0378}'),{code:'UNSUPPORTED_GLYPH'});
 assert.throws(()=>renderProblemSvg({statement:'Value $x'}),{code:'UNCLOSED_MATH'});
 assert.throws(()=>api.renderMath('$x$'));
});

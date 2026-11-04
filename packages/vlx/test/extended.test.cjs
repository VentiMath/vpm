'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {renderMath,parseMath,createRenderer}=require('../index.cjs');
const {layout}=require('../layout.cjs');
test('one complete outer math wrapper is accepted without changing original source',()=>{
 const bare='x+1',reference=layout(parseMath(bare));
 for(const wrapped of ['$x+1$','$$x+1$$',String.raw`\(x+1\)`,String.raw`\[x+1\]`,'  $x+1$ \n']){
  assert.deepEqual(layout(parseMath(wrapped)),reference);
  const r=renderMath(wrapped);assert.equal(r.tex,wrapped);assert.match(r.mathml,/<annotation/);
 }
 for(const bad of ['$x','$x$ $y$','$x$ prose','$$x$$ trailing',String.raw`\(x+1`,String.raw`\(x\)\(y\)`,'$$$x$$$'])assert.throws(()=>renderMath(bad),{code:'TEX'},bad);
 assert.match(renderMath(String.raw`\$`).mathml,/<mo>\$<\/mo>/);
 assert.match(renderMath(String.raw`\text{cost $x$}`).mathml,/<mi>x<\/mi>/);
 const r=createRenderer();assert.notEqual(r.renderMath('$x$'),r.renderMath('x'));
});
test('slanted text uses sheared roman outlines and the crossed-o remains a letter',()=>{
 const normal=layout(parseMath(String.raw`\text{Apg}`)),slant=layout(parseMath(String.raw`\textsl{Apg}`));
 assert.match(slant.svg,/skewX\(-11\.30993\)/);assert.match(slant.mathml||slant.mml,/font-style:oblique/);
 assert.equal(slant.h,normal.h);assert.equal(slant.d,normal.d);assert.ok(slant.w>normal.w);
 assert.notEqual(slant.svg,layout(parseMath(String.raw`\textit{Apg}`)).svg);
 assert.match(renderMath(String.raw`\text{a \textsl{slant} b}`).svg,/skewX/);
 assert.match(renderMath(String.raw`\o+\O`).mathml,/<mi>ø<\/mi>.*<mi>Ø<\/mi>/);
 assert.match(renderMath(String.raw`\text{\o\O}`).mathml,/<mtext>ø<\/mtext><mtext>Ø<\/mtext>/);
 assert.doesNotMatch(renderMath(String.raw`\o`).mathml,/∅/);
});
test('bounded array spacing replaces padding and preserves cells, spans and rules',()=>{
 const plain=String.raw`\begin{array}{lc}a&b\\c&d\end{array}`;
 const gap=String.raw`\begin{array}{l@{\hspace{2em}}c}a&b\\c&d\end{array}`;
 const b=layout(parseMath(plain)),g=layout(parseMath(gap));assert.ok(Math.abs(g.w-b.w-1.3)<1e-10);assert.equal(g.h,b.h);
 const tight=layout(parseMath(String.raw`\begin{array}{@{}l@{}c@{}}a&b\\c&d\end{array}`));assert.ok(Math.abs(b.w-tight.w-1.3)<1e-10);
 const extra=layout(parseMath(String.raw`\begin{array}{lc}\vspace{4pt}a&b\\c&d\end{array}`));assert.ok(Math.abs(extra.h+extra.d-b.h-b.d-.4)<1e-10);assert.match(extra.mml,/rowspacing="0.7em"/);
 const span=renderMath(String.raw`\begin{array}{|l@{\hspace{1em}}c|}\hline\multicolumn{2}{|c|}{ab}\\x&y\\\hline\end{array}`);assert.match(span.mathml,/columnspan="2"/);assert.match(span.svg,/stroke-width=".06"/);
 for(const spec of ['l@{x}c','l@{\\hspace{-1em}}c','l@{\\hspace{65em}}c','l@{}@{}c','l@{\\hspace{NaNem}}c'])assert.throws(()=>renderMath('\\begin{array}{'+spec+'}a&b\\end{array}'));
 for(const body of [String.raw`a&\vspace{1em}b`,String.raw`\vspace{-1em}a&b`,String.raw`\vspace{40em}\vspace{40em}a&b`])assert.throws(()=>renderMath('\\begin{array}{lc}'+body+'\\end{array}'));
 assert.throws(()=>renderMath(String.raw`\vspace{1em}x`),{code:'TEX'});
});
test('damaged string escapes are rejected, including inside comments and text',()=>{
 for(const n of [0,1,8,11,12,14,31,127])for(const source of ['x'+String.fromCharCode(n)+'y','\\text{x'+String.fromCharCode(n)+'}', '%'+String.fromCharCode(n)+'\nx'])assert.throws(()=>renderMath(source),{code:'TEX'});
 assert.doesNotThrow(()=>renderMath('\t x\r\n+y'));
 for(const name of ['equal','plus','minus','ds'])assert.throws(()=>renderMath('\\'+name),{code:'TEX'});
});

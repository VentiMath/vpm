'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {parse,parseMath,renderMath,createRenderer}=require('../index.cjs');
test('all delimiters, braces, escaped currency, comments and source spans',()=>{
 const source=String.raw`Pay \$5. $x$ and \(y\), $$\frac{1}{2}$$ then \[z\] and $\text{$ stays here}$.`,d=parse(source);assert.deepEqual(d.diagnostics,[]);assert.deepEqual(d.nodes.filter(x=>x.kind==='math').map(n=>[n.tex,n.display]),[['x',false],['y',false],[String.raw`\frac{1}{2}`,true],['z',true],[String.raw`\text{$ stays here}`,false]]);assert.equal(d.nodes.map(n=>n.raw).join(''),source);for(const n of d.nodes)assert.equal(n.raw,source.slice(n.start,n.end));assert.match(d.nodes[0].value,/Pay \$5/);assert.equal(parse('$x% $ ignored\n+y$').nodes[0].tex,'x% $ ignored\n+y');assert.equal(parse(String.raw`a \\(b)`).nodes.length,1);assert.equal(parse('a $open').diagnostics[0].start,2);assert.throws(()=>parse('123',{maxLength:2}),{code:'LIMIT'});
});
test('uncached render and bounded LRU return immutable output',()=>{
 const r=createRenderer({cacheEntries:2}),a=r.renderMath('x');assert.equal(a,r.renderMath('x'));assert.ok(Object.isFrozen(a));r.renderMath('x',{display:true});r.renderMath('y');assert.notEqual(a,r.renderMath('x'));const b=r.renderMath('x');r.clearCache();assert.notEqual(b,r.renderMath('x'));const tiny=createRenderer({cacheBytes:1});assert.notEqual(tiny.renderMath('x'),tiny.renderMath('x'));assert.throws(()=>r.renderMath('x',{fontSize:Infinity}));assert.throws(()=>r.renderMath('x'.repeat(16385)),{code:'LIMIT'});assert.throws(()=>renderMath('x',{display:'yes'}));
});
test('TeX token boundaries, scripts, roots and mathematical semantics',()=>{
 const a=parseMath(String.raw`\frac12`).children[0];assert.equal(a.numerator.text,'1');assert.equal(a.denominator.text,'2');const b=parseMath('x^12').children;assert.equal(b[0].sup.text,'1');assert.equal(b[1].text,'2');assert.equal(parseMath(String.raw`\sqrt12`).children[0].body.text,'1');assert.match(renderMath('x_1^2').mathml,/<msubsup>/);assert.match(renderMath(String.raw`\sqrt[3]{x}`).mathml,/<mroot>/);assert.match(renderMath(String.raw`\mathbb{R}`).mathml,/ℝ/);assert.throws(()=>renderMath(String.raw`\newcommand{\frac}{9}\frac`),{code:'TEX'});for(const bad of [String.raw`\constructor`,String.raw`\toString`,'#','$'])assert.throws(()=>renderMath(bad),{code:'TEX'});
});
test('prose escaping and expressions share one output path',()=>{const r=createRenderer(),out=r.renderText('<b> $x$ & $y$');assert.match(out.html,/^&lt;b&gt; /);assert.match(out.html,/ &amp; /);assert.equal(out.nodes[1].svg,r.renderMath('x').svg);assert.throws(()=>r.renderText('$unclosed'),{code:'UNCLOSED_MATH'});const svg=r.renderMath(String.raw`\color{red}{x}`);assert.match(svg.svg,/color="red"/);assert.doesNotMatch(svg.svg,/MathJax|katex|<text|href=/)});
test('independent layout against current engines and actual PNG pixels',()=>{const r=spawnSync(process.execPath,[path.resolve(__dirname,'../../../scripts/vlx-conformance/run.cjs')],{encoding:'utf8',timeout:90000});assert.equal(r.status,0,r.stdout+r.stderr)});

test('prime runs, font variants, scoped declarations and nested text retain meaning',()=>{
 assert.match(renderMath("f''(x)").mathml,/<msup>.*′.*′/);
 assert.match(renderMath(String.raw`\textbf{Choose $x^2$ or \textit{none}}`).mathml,/<msup>/);
 for(const tex of [String.raw`\mathbb{ABP}`,String.raw`\mathcal{F}`,String.raw`\mathscr{F}`,String.raw`\tt{ABC}`,String.raw`\textsc{answer}`])assert.match(renderMath(tex).svg,/<path/);
 assert.notEqual(renderMath(String.raw`\mathcal{F}`).svg,renderMath(String.raw`\mathscr{F}`).svg);
 assert.equal(parseMath(String.raw`{\color{red}x}y`).children.length,2);
 assert.match(renderMath(String.raw`\underbrace{x+y}_{2}`).mathml,/<munder>/);
 assert.match(renderMath(String.raw`\phantom{x^2}`).mathml,/<mphantom>/);
 assert.doesNotMatch(renderMath(String.raw`\phantom{x^2}`).svg,/<path/);
 assert.equal(parseMath(String.raw`{1 \over 3}`).children[0].kind,'fraction');
 for(const tex of [String.raw`\hspace{999em}`,String.raw`\makebox[999mm]{}`,String.raw`\newcommand{\tag}{bad}x`,String.raw`\multicolumn{2}{c}{x}`,String.raw`1\over2\over3`,String.raw`\textbf{unclosed`,String.raw`x^2^3`])assert.throws(()=>renderMath(tex));
});

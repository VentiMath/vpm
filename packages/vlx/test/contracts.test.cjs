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
test('contest relations and single-symbol negation retain glyphs, semantics and spacing',()=>{
 const relations={cong:'≅',sim:'∼',simeq:'≃',mid:'∣',nmid:'∤',parallel:'∥',nparallel:'∦',leqslant:'⩽',geqslant:'⩾',nsim:'≁',ncong:'≇'};
 for(const [command,char]of Object.entries(relations)){
  const tex='a\\'+command+' b',ast=parseMath(tex);assert.equal(ast.children[1].class,'rel');
  const result=renderMath(tex);assert.ok(result.mathml.includes('<mo>'+char+'</mo>'));assert.match(result.svg,/<path/);
  assert.ok(result.width>renderMath('ab').width+renderMath('\\'+command).width+6,'Relation spacing around '+command);
 }
 for(const [input,output]of Object.entries({'=':'≠','\\sim':'≁','\\cong':'≇','\\in':'∉','\\mid':'∤','\\parallel':'∦','\\leq':'≰','\\geq':'≱','<':'≮','>':'≯','\\subset':'⊄','\\supset':'⊅','\\subseteq':'⊈','\\supseteq':'⊉','\\rightarrow':'↛','\\leftarrow':'↚','\\leftrightarrow':'↮','\\Rightarrow':'⇏','\\Leftarrow':'⇍','\\Leftrightarrow':'⇎'})){
  assert.equal(renderMath('\\not'+input).svg,renderMath(output).svg.replace(/<title>.*?<\/title>/,()=>'<title>'+('\\not'+input).replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</title>'));
  assert.ok(renderMath('\\not'+input).mathml.includes('<mo>'+output+'</mo>'));
 }
 for(const tex of [String.raw`\not\leqslant`,String.raw`\not\geqslant`]){const result=renderMath(tex);assert.match(result.svg,/stroke-width=".05"/);assert.match(result.mathml,/&#x338;/);assert.equal(parseMath(tex).children[0].class,'rel');}
 assert.match(renderMath(String.raw`\not{x}`).mathml,/<mi>x&#x338;<\/mi>/);
 assert.match(renderMath(String.raw`\not{=}_1`).mathml,/<msub><mo>≠<\/mo>/);
 assert.equal(parseMath(String.raw`\not\in A`).children.length,2);
 for(const tex of [String.raw`\not`,String.raw`\not{}`,String.raw`\not{xy}`,String.raw`\not\frac12`,String.raw`\newcommand{\not}{x}`])assert.throws(()=>renderMath(tex),{code:'TEX'});
 assert.throws(()=>renderMath('\\not'.repeat(100)+'='),{code:'LIMIT'});
});
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

test('browser output inherits theme and font size without changing standalone export',()=>{
 const r=createRenderer(),implicit=r.renderMath('x'),explicit=r.renderMath('x',{fontSize:16});
 assert.match(implicit.html,/font-size:calc\(var\(--vlx-scale,1\) \* 1em\)/);assert.match(explicit.html,/font-size:calc\(var\(--vlx-scale,1\) \* 16px\)/);assert.notEqual(implicit,explicit);for(const fontSize of [Infinity,NaN,'16',0,-1,257])assert.throws(()=>r.renderMath('x',{fontSize}));
 assert.equal(implicit.svg,explicit.svg);assert.match(implicit.svg,/color="black"/);assert.doesNotMatch(implicit.html,/color="black"|<title>/);
 assert.match(implicit.html,/aria-hidden="true"/);assert.match(implicit.html,/data-vlx="math"/);assert.doesNotMatch(implicit.html,/<style/);assert.doesNotMatch(implicit.svg,/forced-colors/);
 assert.match(r.renderMath(String.raw`\underline{x}`).mathml,/accentunder="true"/);
 const {observeMath}=require('../dom.cjs');assert.throws(()=>observeMath({}),TypeError);
});

test('production syntax has independent layout, visible operators and bounded arguments',()=>{
 for(const [name,tex]of require('../../../scripts/vlx-conformance/production-corpus.cjs')){const r=renderMath(tex,{display:true});assert.match(r.svg,/<path|<rect/,name);assert.match(r.mathml,/<math/,name);assert.ok(Number.isFinite(r.width)&&r.width>0,name);}
 assert.ok(renderMath(String.raw`a\\b`).height>renderMath('ab').height*1.5);
 assert.match(renderMath(String.raw`a\\b`).mathml,/<mtable/);assert.doesNotMatch(renderMath('a\\\nb').mathml,/<mtable/);
 assert.match(renderMath(String.raw`{n\choose2}`).mathml,/<mfrac linethickness="0">/);
 assert.equal(parseMath(String.raw`a\mathbin{\yen}b`).children[1].class,'bin');
 assert.match(renderMath(String.raw`\stackrel{+}{=}`).mathml,/<mover>/);
 assert.match(renderMath(String.raw`\boldsymbol{x+1}`).mathml,/<mi mathvariant="bold-italic">x/);
 assert.match(renderMath(String.raw`\boldsymbol{\textit{value}}`).mathml,/mathvariant="bold-italic"/);
 assert.notEqual(renderMath(String.raw`\boldsymbol{x}`).svg,renderMath(String.raw`\mathbf{x}`).svg);
 assert.ok(renderMath(String.raw`a\\[-2em]b`).height>renderMath('a').height);
 assert.match(renderMath(String.raw`\text{\char"00A2}`).mathml,/¢/);
 for(const bad of [String.raw`\rule{-2em}{1em}`,String.raw`\rule{999em}{1pt}`,String.raw`\text{\char"110000}`,String.raw`\textit{\(x}`,String.raw`{1\choose2\over3}`,String.raw`\newcommand{\mathbin}{x}`])assert.throws(()=>renderMath(bad));
 assert.throws(()=>renderMath(Array(130).fill('x').join('\\\\')),{code:'LIMIT'});
});

test('source fallback isolates formula errors and keeps all source prose escaped',()=>{
 const r=createRenderer(),source=String.raw`<img src=x> $x^2$ $\unknown{<b>}$ $y+1$ and $open`;
 assert.throws(()=>r.renderText(source));const result=r.renderText(source,{errorMode:'source'});
 assert.equal(result.nodes.filter(n=>n.kind==='math'&&!n.error).length,2);assert.equal(result.nodes.filter(n=>n.error).length,1);assert.equal(result.diagnostics.length,2);
 assert.doesNotMatch(result.html,/<img|<b>/);assert.match(result.html,/&lt;img/);assert.match(result.html,/\$open/);
 assert.throws(()=>r.renderText('$x$',{errorMode:'invalid'}),TypeError);assert.throws(()=>r.renderText('$x$',{errorMode:'source',fontSize:NaN}),RangeError);
});

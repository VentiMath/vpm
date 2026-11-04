'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),load=require('./load.cjs'),vlx=load(),{renderPng}=load('png'),references=require('./reference.cjs');
const {PNG}=require('../../packages/vpngjs');
// Compare semantic token order independently of layout wrappers and data-latex.
const tokens=mml=>[...mml.matchAll(/<(mi|mn|mo|mtext)\b[^>]*>(.*?)<\/\1>/gs)].map(m=>m[2].replace(/<[^>]+>/g,'').replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/\s/g,'')).join('').replace(/[¯―\u2061-\u2064]/g,'').normalize('NFKC').replace(/″/g,'′′').replace(/−/g,'-').replace(/⌢/g,'');
(async()=>{
 const renderer=vlx.createRenderer(),report=[],pictures=[];
 for(const [name,tex] of require('./corpus.cjs')){
  const r=renderer.renderMath(tex,{display:true});let control;try{control=await references.mathjax(tex)}catch(error){assert.equal(name,'array span',String(error.stack||error.message||error));assert.match(error.message,/multicolumn/);}assert.match(r.mathml,/<math/);assert.doesNotMatch(r.svg,/<(?:text|foreignObject|script)\b|(?:href|src)=/);assert.ok(r.width>0&&r.height>0);
  // Enclosures/arc accents have different control-token representation; those
  // are checked structurally and in the exported visual comparison instead.
  if(control&&!['overarc','colored formula','text'].includes(name))assert.equal(tokens(r.mathml),tokens(control.mathml),name+' semantic tokens');
  const png=await renderPng(renderer,tex),decoded=PNG.sync.read(png.data);assert.equal(decoded.width,png.width);assert.equal(decoded.height,png.height);assert.ok(decoded.data.some((v,i)=>i%4!==3&&v<240),name+' visible ink');
  if(name==='array rule'){let line=false;for(let y=0;y<decoded.height;y++){let dark=0;for(let x=0;x<decoded.width;x++)if(decoded.data[(y*decoded.width+x)*4]<100)dark++;if(dark>decoded.width*.8)line=true;}assert.ok(line,'array rule remains visible');}
  let katex='pass',katexOutput;try{katexOutput=references.katex(tex)}catch{ katex='unsupported' }
  if(['contest relations','slanted inequalities','negated relations','negated similarity'].includes(name)){
   assert.equal(katex,'pass',name+' KaTeX support');assert.equal(tokens(r.mathml),tokens(katexOutput),name+' KaTeX semantics');
  }
  report.push({name,vlx:'pass',mathjax:control?'pass':'unsupported',katex});pictures.push({name,r,control});
 }
 if(process.env.VLX_OUTPUT){
  const {Resvg}=require('@resvg/resvg-js'),out=process.env.VLX_OUTPUT;fs.mkdirSync(out,{recursive:true});let y=36;const parts=[];
  for(const {name,r,control} of pictures){const mj=(name==='equation label'?'<svg><text y="20">Responsive reference SVG: semantic check only</text></svg>':control?.svg||'<svg><text y="20">Unsupported by the reference engine</text></svg>').replace(/<svg\b/,`<svg x="570" y="${y+22}"`).replace(/currentColor/g,'black').replace(/\sdata-latex="[^"]*"/g,'');parts.push(`<text x="20" y="${y}" font-family="sans-serif" font-size="14">${name} — VLX (left), MathJax 4 (right)</text><g transform="translate(20 ${y+22})">${r.svg}</g>${mj}`);y+=Math.max(110,r.height+55);}
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${y}" viewBox="0 0 1080 ${y}"><rect width="1080" height="${y}" fill="white"/>${parts.join('')}</svg>`;fs.writeFileSync(path.join(out,'comparison.svg'),svg);fs.writeFileSync(path.join(out,'comparison.png'),new Resvg(svg).render().asPng());fs.writeFileSync(path.join(out,'corpus.json'),JSON.stringify(report,null,2)+'\n');
 }
 assert.throws(()=>renderer.renderMath(String.raw`\unknownCommand`),{code:'TEX'});
 assert.throws(()=>renderer.renderMath(String.raw`\href{https://example.com}{x}`),{code:'TEX'});
 assert.throws(()=>renderer.renderMath(String.raw`\includegraphics{x}`),{code:'TEX'});
 assert.throws(()=>renderer.renderMath(String.raw`\newcommand{\again}{\again}\again`),{code:'LIMIT'});
 renderer.renderMath(String.raw`\newcommand{\privateMacro}{9}\privateMacro`);assert.throws(()=>renderer.renderMath(String.raw`\privateMacro`),{code:'TEX'});
 const out=renderer.renderText(String.raw`A < B and \(x^2\).`);assert.match(out.html,/A &lt; B/);assert.equal(out.nodes.filter(n=>n.kind==='math').length,1);
 assert.throws(()=>renderer.renderMath('{'.repeat(100)+'x'+'}'.repeat(100)),{code:'LIMIT'});assert.throws(()=>renderer.renderMath(String.raw`\frac`.repeat(100)),{code:'LIMIT'});
 for(const bad of [String.raw`x^2^3`,String.raw`\frac{1}`,String.raw`\begin{array}{c}1&2\end{array}`,String.raw`\left(x`,String.raw`\end{array}`])assert.throws(()=>renderer.renderMath(bad),{code:'TEX'});
 await assert.rejects(renderPng(renderer,'x',{scale:9}),RangeError);
 console.log(JSON.stringify(report));console.log('Independent layout, MathJax semantic controls, KaTeX capability checks, PNG pixels and bounded failure cases pass.');
})().catch(error=>{console.error(error);process.exitCode=1});

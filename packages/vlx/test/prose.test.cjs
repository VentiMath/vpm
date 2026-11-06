'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{createRequire}=require('node:module');
const consumer=process.env.VPM_VLX_CONSUMER&&createRequire(path.join(process.env.VPM_VLX_CONSUMER,'package.json'));
const load=consumer?(name='index')=>consumer(name==='index'?'vlx':'vlx/'+name):require('../../../scripts/vlx-conformance/load.cjs');
const {renderProblemSvg}=load('problem'),fonts=require(consumer?path.join(path.dirname(consumer.resolve('vlx/package.json')),'font/glyphs.json'):'../font/glyphs.json');
const {JSDOM}=require('../../../scripts/vlx-conformance/node_modules/jsdom');
const outline=(char,font='normal')=>fonts.paths[(fonts.variants[font][char]||fonts.variants.normal[char])[4]];
function glyphs(svg,char,font='normal'){
 const dom=new JSDOM(svg),items=[...dom.window.document.querySelectorAll('path')].filter(p=>p.getAttribute('d')===outline(char,font)).map(p=>{
  let x=0,y=0;
  for(let g=p.parentElement;g;g=g.parentElement){const t=g.getAttribute('transform')||'',m=/translate\(([-.\d]+) ([-.\d]+)\)(?: scale\(([-.\d]+)\))?/.exec(t);if(m){const s=Number(m[3]??1);x=x*s+Number(m[1]);y=y*s+Number(m[2]);}}
  return {x,y};
 });dom.window.close();return items;
}
test('math-adjacent apostrophes and closing quotes retain context; spaced opening quotes and primes still work',()=>{
 for(const [source,expected]of [["Exactly five $1$'s.",'Exactly five $1$’s.'],['"$x$" is a variable.','“$x$” is a variable.'],["$x$ 'quoted'",'$x$ ‘quoted’']])assert.deepEqual(renderProblemSvg({statement:source}),renderProblemSvg({statement:expected}));
 assert.match(load().renderMath("x'").mathml,/<msup>/);
});
test('lists emit one marker per item, hanging wrapped text, nested indentation and normal prose after the list',()=>{
 const statement=String.raw`Before. \begin{itemize}\item Alpha `+'word '.repeat(55)+String.raw`\begin{itemize}\item Beta\end{itemize}\item Gamma\end{itemize}After.`;
 const {svg}=renderProblemSvg({statement}),bullets=glyphs(svg,'•');assert.equal(bullets.length,3);assert(bullets[1].x>bullets[0].x);assert.equal(bullets[2].x,bullets[0].x);assert(bullets[1].y>bullets[0].y);assert(bullets[2].y>bullets[1].y);
 assert.equal(glyphs(svg,'\\').length,0,'TeX list syntax is consumed');
 const words=glyphs(svg,'w');assert(words.length>30);const lines=new Map();for(const p of words)if(!lines.has(p.y))lines.set(p.y,p.x);assert(lines.size>1);assert.equal([...lines.values()].at(-1),glyphs(svg,'A')[0].x,'Wrapped content hangs at the item text margin');
 assert.equal(glyphs(svg,'A').at(-1).x,36,'Prose after a list returns to the page margin');
});
test('enumeration resets, custom text/math labels render, and lists can contain figures between text parts',()=>{
 const {svg}=renderProblemSvg({statement:String.raw`\begin{enumerate}\item Alpha\item Beta\end{enumerate}\begin{enumerate}\item Gamma\item[($N$)] Delta\item[] Epsilon\item[Type~1:] Zeta\end{enumerate}`});
 assert.equal(glyphs(svg,'1').length,3,'Two fresh counters and one explicit label');assert.equal(glyphs(svg,'2').length,1);assert.equal(glyphs(svg,'N','italic').length,1);assert.equal(glyphs(svg,'\\').length,0);
 const {Resvg}=require('../../../scripts/vlx-conformance/node_modules/@resvg/resvg-js');const png=new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="red"/></svg>').render().asPng();
 const picture=renderProblemSvg({statementParts:[{kind:'text',text:String.raw`\begin{itemize}\item Before `},{kind:'image',figure:{png,width:20}},{kind:'text',text:String.raw` after.\end{itemize}`}]}).svg;assert.equal(glyphs(picture,'•').length,1);assert.match(picture,/<image /);
});
test('list structures and labels are bounded; malformed lists never become literal TeX pictures',()=>{
 for(const source of [String.raw`\item orphan`,String.raw`\begin{itemize}\item open`,String.raw`\begin{itemize}\item x\end{enumerate}`,String.raw`\begin{itemize}\end{itemize}`,String.raw`\begin{itemize}\item[open`])assert.throws(()=>renderProblemSvg({statement:source}),{code:'LIST'});
 assert.throws(()=>renderProblemSvg({statement:String.raw`\begin{itemize}\item[`+'a'.repeat(257)+String.raw`] x\end{itemize}`}),{code:'LIMIT'});
 assert.throws(()=>renderProblemSvg({statement:String.raw`\begin{itemize}\item `.repeat(9)+'x'+String.raw`\end{itemize}`.repeat(9)}),{code:'LIMIT'});
 assert.doesNotThrow(()=>renderProblemSvg({statement:String.raw`Literal \\item text.`}));
});

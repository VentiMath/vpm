'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {renderDocument,renderMath,createRenderer}=require('..');
const {JSDOM}=require('../../../scripts/vlx-conformance/node_modules/jsdom');
const doc=source=>new JSDOM(source).window.document;
const equation=(value,label)=>String.raw`\begin{equation}${value}\label{${label}}\end{equation}`;
test('document-scoped forward/back references, semantic numbers and safe linked targets',()=>{
 const source=String.raw`Forward \eqref{first}; `+equation('x=1','first')+String.raw` then $x=\ref{first}$ and \ref{second}. `+equation('y=2','second');
 const result=renderDocument(source,{idPrefix:'lesson'}),d=doc(result.html);
 assert.deepEqual(result.equations.map(e=>e.number),[1,2]);assert.deepEqual(result.references.map(r=>r.display),['(1)','1','2']);assert.equal(result.nextNumber,3);
 assert.equal(d.querySelectorAll('mlabeledtr').length,2);assert.equal(d.querySelectorAll('a').length,3);assert.equal(d.querySelectorAll('[data-vlx="math"]').length,5);
 for(const a of d.querySelectorAll('a')){const target=d.getElementById(a.getAttribute('href').slice(1));assert(target);assert.equal(target.tabIndex,-1);assert.equal(a.tabIndex,0);assert.equal(a.closest('svg').getAttribute('aria-hidden'),null);assert.match(a.getAttribute('aria-label'),/^Equation [12]$/);}
 assert.equal(renderDocument(equation('z=3','first')).equations[0].number,1);
 assert.throws(()=>renderDocument(String.raw`\ref{first}`),{code:'UNDEFINED_REFERENCE'});
 const renderer=createRenderer();renderer.renderDocument(source);assert.throws(()=>renderer.renderMath(String.raw`\ref{first}`),{code:'TEX'});
});
test('AMS, all and none policies; starred rows, custom tags and nonumber match current MathJax',async()=>{
 const ams=String.raw`\begin{equation}a=1\label{a}\end{equation}
\begin{align}b&=2\label{b}\\c&=3\notag\\d&=4\tag{D}\label{d}\\e&=5\label{e}\end{align}
\begin{gather}f=6\label{f}\\g=7\nonumber\end{gather}
\begin{equation*}h=8\end{equation*}\begin{align*}i&=9\tag*{I}\label{i}\end{align*}
References: \eqref{a}, $\ref{d}$ and \ref{i}.`;
 for(const numbering of ['ams','all','none']){
  const source=numbering==='none'?String.raw`\begin{equation}a=1\tag{A}\label{a}\end{equation} \ref{a}`:ams+(numbering==='all'?String.raw`$$q=9\label{q}$$`:'');
  const expected=await(await require('../../../scripts/vlx-conformance/equation-reference.cjs').factory(numbering))(source);
  const actual=renderDocument(source,{numbering});assert.deepEqual(Object.fromEntries(actual.equations.flatMap(e=>e.labels.map(l=>[l,e.tag]))),expected.labels);
 }
 const result=renderDocument(ams),d=doc(result.html);assert.deepEqual(result.equations.map(e=>e.tag),['1','2','D','3','4','I']);assert.equal(result.equations.at(-1).displayTag,'I');assert.equal(d.querySelectorAll('mlabeledtr').length,6);
});
test('renumbering and labels are rebuilt on edits without stale cached values',()=>{
 const r=createRenderer(),a=equation('x=1','a'),b=equation('y=2','b'),reference=String.raw`\eqref{b}`;
 const first=r.renderDocument(a+b+reference,{startNumber:7,idPrefix:'paper'}),second=r.renderDocument(b+reference,{idPrefix:'paper'});
 assert.equal(first.references[0].tag,'8');assert.equal(second.references[0].tag,'1');assert.equal(first.equations[1].id,second.equations[0].id);
 first.equations[0].tag='tampered';assert.equal(r.renderDocument(a).equations[0].tag,'1');
 assert.throws(()=>r.renderDocument(a+reference),{code:'UNDEFINED_REFERENCE'});
 assert.notEqual(r.renderDocument(b,{idPrefix:'one'}).equations[0].id,r.renderDocument(b,{idPrefix:'two'}).equations[0].id);
});
test('comments, escaped references, leading macros, style groups and source ranges',()=>{
 const source=String.raw`Literal \\ref{missing}. \[\newcommand{\named}[1]{#1\label{expanded}}\named{x=1}\] $\text{See \eqref{expanded}}$.`;
 const result=renderDocument(source,{numbering:'all'});assert.equal(result.references.length,1);assert.equal(result.references[0].label,'expanded');
 assert.match(doc(result.html).body.textContent,/\\\\ref\{missing\}/);
 for(const n of result.nodes)assert.equal(source.slice(n.start,n.end),n.raw);
 assert.equal(renderDocument(String.raw`See \eqref {space}. \begin {equation}x\label{space}\end {equation}`).references[0].tag,'1');
 const comments=renderDocument(String.raw`\begin{align}x&=1 % \label{ignored} \end{align}
\label{real}\\y&=2\label{next}\end{align}`);assert.deepEqual(comments.equations.map(e=>e.labels),[['real'],['next']]);
 assert.equal(renderMath(String.raw`\newcommand{\ref}{x}\ref`).tex,String.raw`\newcommand{\ref}{x}\ref`,'Ordinary formula macro behavior stays unchanged');
});
test('invalid definitions fail explicitly; source fallback rolls back incomplete definitions',()=>{
 for(const [source,code]of [[equation('x','a')+equation('y','a'),'DUPLICATE_LABEL'],[String.raw`$x\label{a}$`,'EQUATION_CONTEXT'],[String.raw`$$x\label{a}$$`,'UNNUMBERED_LABEL'],[String.raw`\label{a}`,'EQUATION_CONTEXT'],[String.raw`\begin{equation}x\tag{A}\notag\end{equation}`,'TAG'],[equation('x','bad label'),'LABEL'],[String.raw`\begin{equation}x\\y\end{equation}`,'EQUATION_CONTEXT'],[String.raw`\begin{equation}x\tag{\ref{a}}\end{equation}`,'TAG']])assert.throws(()=>renderDocument(source),{code},source);
 const source=String.raw`\begin{align}x&=1\label{rolled-back}\\y&=2\tag{A}\tag{B}\end{align}`+equation('z','valid')+String.raw`\ref{rolled-back} and $\unknown$`;
 const r=renderDocument(source,{errorMode:'source'});assert.deepEqual(r.equations.map(e=>e.tag),['1']);assert.deepEqual(r.diagnostics.map(e=>e.code),['TAG','UNDEFINED_REFERENCE','TEX']);assert.equal(r.references.length,0);assert.match(doc(r.html).body.textContent,/\\unknown/);
 // A layout error still has its visibly failed source target, never a dead link.
 const failed=renderDocument(equation('🦄','bad')+String.raw`\ref{bad}`,{errorMode:'source'}),d=doc(failed.html);assert.equal(failed.diagnostics[0].code,'UNSUPPORTED_GLYPH');assert(d.getElementById(failed.references[0].id));assert.match(d.body.textContent,/🦄/);
});
test('bounds and injection attempts cannot create unsafe IDs, markup or links',()=>{
 for(const idPrefix of ['', 'x" onclick="bad', 'https://evil', 'x'.repeat(129),7])assert.throws(()=>renderDocument('text',{idPrefix}),TypeError);
 for(const startNumber of [0,-1,1.5,NaN,1000001])assert.throws(()=>renderDocument('text',{startNumber}),RangeError);
 for(const numbering of ['auto',true,0])assert.throws(()=>renderDocument('text',{numbering}),TypeError);
 assert.throws(()=>renderDocument('text',{errorMode:'ignore'}),TypeError);
 for(const label of ['bad label','<img>','a'.repeat(129)])assert.throws(()=>renderDocument(equation('x',label)),{code:'LABEL'});
 for(const label of ['__proto__','constructor','eq:a/b.c-d'])assert.equal(renderDocument(equation('x',label)+String.raw`\ref{${label}}`).references[0].tag,'1');
 const r=renderDocument('<img src=x onerror=bad>'+String.raw`\begin{equation}x\tag{<script>}\label{x}\end{equation}\ref{x}`),d=doc(r.html);assert.equal(d.querySelector('img,script'),null);assert.equal(r.equations[0].tag,'<script>');
 assert.throws(()=>renderDocument('x'.repeat(131073)),{code:'LIMIT'});
 assert.throws(()=>renderDocument(equation('x','a')+equation('y','b'),{startNumber:1000000}),{code:'LIMIT'});
 assert.throws(()=>renderDocument(Array.from({length:1025},(_,i)=>equation('x','e'+i)).join('')),{code:'LIMIT'});
 assert.throws(()=>renderDocument('$x$'.repeat(4097)),{code:'LIMIT'});
});

'use strict';
// Node entry: page composition uses the same outlined glyphs and math layout as
// the browser entry. Images are validated locally; no URLs or system fonts load.
const {parse,VlxError}=require('./source.cjs');
const {parseMath}=require('./tex.cjs');
const {text,layout,move,box}=require('./layout.cjs');
const {typography}=require('./typography.cjs');
const {PNG}=require('vpngjs');
const WIDTH=960,PAD=36,EM=28,CONTENT=WIDTH-2*PAD,PIXELS=16000000;
function pngSize(bytes){const {width,height}=PNG.sync.read(bytes,{maxPixels:PIXELS,maxBytes:10*1024*1024});return {width,height};}
function segments(source){
 const result=parse(source);if(result.diagnostics.length)throw new VlxError('UNCLOSED_MATH',result.diagnostics[0].message);
 return result.nodes.map(n=>({kind:n.kind==='text'?'text':n.display?'display':'math',source:n.kind==='text'?n.value:n.tex}));
}
function scaled(b,s){return box(b.w*s,b.h*s,b.d*s,move(b,0,0,s),b.mml);}
function fit(b){return b.w>CONTENT?scaled(b,CONTENT/b.w):b;}
function math(tex,display=false){return scaled(layout(parseMath(tex),{display}),EM);}
function literal(value){return scaled(text(typography(value)),EM);}
function join(parts){let w=0,h=0,d=0,svg='';for(const b of parts){svg+=move(b,w);w+=b.w;h=Math.max(h,b.h);d=Math.max(d,b.d);}return box(w,h,d,svg,'');}
function renderProblemSvg(problem){
 if(!problem||typeof problem!=='object')throw new TypeError('Expected a problem');
 const tokens=[];let inputBytes=0,imageBytes=0,decodedPixels=0;
 function append(token){if(tokens.length>=8192)throw new VlxError('LIMIT','Problem has too many layout items');tokens.push(token);}
 function image(figure){
  if(!figure||!Number.isFinite(figure.width)||figure.width<=0)throw new TypeError('Figure width must be positive and finite');
  if(!(figure.png instanceof Uint8Array))throw new TypeError('Figure png must be a Uint8Array');
  imageBytes+=figure.png.byteLength;if(imageBytes>20*1024*1024)throw new VlxError('LIMIT','Problem images exceed the byte budget');
  const size=pngSize(figure.png);decodedPixels+=size.width*size.height;if(decodedPixels>32000000)throw new VlxError('LIMIT','Problem images exceed the pixel budget');
  const w=Math.min(CONTENT,figure.width*EM/16),h=w*size.height/size.width;
  if(!Number.isFinite(h)||h>16384)throw new VlxError('LIMIT','Figure is too tall');
  return box(w,h,0,`<image x="0" y="${-h}" width="${w}" height="${h}" href="data:image/png;base64,${Buffer.from(figure.png).toString('base64')}"/>`,'');
 }
 function prose(source){
  if(typeof source!=='string')throw new TypeError('Statement text must be a string');
  inputBytes+=source.length;if(inputBytes>131072)throw new VlxError('LIMIT','Problem text exceeds the length budget');
  for(const span of segments(source.replace(/\r\n?/g,'\n'))){
   if(span.kind!=='text'){append({kind:span.kind,box:math(span.source,span.kind==='display')});continue;}
   const words=typography(span.source).match(/[ \t]*\n(?:[ \t]*\n)+| {2,}\n|\s+|[^\s]+/g)||[];
   for(const word of words){
    if(/\n[ \t]*\n/.test(word))append({kind:'paragraph'});
    else if(/^ {2,}\n$/.test(word))append({kind:'break'});
    else if(/^\s+$/.test(word))append({kind:'space'});
    else append({kind:'word',box:scaled(text(word),EM)});
   }
  }
 }
 if(problem.statementParts!==undefined){
  if(!Array.isArray(problem.statementParts)||problem.statementParts.length>1024)throw new TypeError('Invalid statement parts');
  let pending='';const flush=()=>{if(pending){prose(pending);pending='';}};
  for(const part of problem.statementParts){
   if(part?.kind==='text'){if(typeof part.text!=='string')throw new TypeError('Invalid text part');pending+=part.text;if(pending.length>131072)throw new VlxError('LIMIT','Problem text exceeds the length budget');}
   else if(part?.kind==='image'){flush();if(part.display!==undefined&&!['inline','block'].includes(part.display))throw new TypeError('Invalid image display');append({kind:part.display==='block'?'display':'image',box:image(part.figure)});}
   else throw new TypeError('Invalid statement part');
  }
  flush();
 }else prose(problem.statement??'');
 let y=PAD,bottom=PAD,line=[],lineWidth=0,pendingSpace=false;const output=[];
 function check(){if(y>16384||WIDTH*Math.ceil(Math.max(y,bottom)+PAD)>PIXELS)throw new VlxError('LIMIT','Problem page exceeds the pixel budget');}
 function lineOut(center=false){
  if(!line.length)return;
  const h=Math.max(EM*.72,...line.map(b=>b.h)),d=Math.max(EM*.22,...line.map(b=>b.d));
  let x=PAD+(center?(CONTENT-lineWidth)/2:0);for(const b of line){output.push(move(b,x,y+h));x+=b.w;}
  bottom=y+h+d;y=bottom+EM*.45;line=[];lineWidth=0;pendingSpace=false;check();
 }
 function block(b){lineOut();b=fit(b);line=[b];lineWidth=b.w;lineOut(true);}
 function put(b){b=fit(b);const gap=pendingSpace&&line.length?EM*.3:0;
  if(line.length&&lineWidth+gap+b.w>CONTENT)lineOut();
  else if(gap){line.push(box(gap,0,0,'',''));lineWidth+=gap;}
  line.push(b);lineWidth+=b.w;pendingSpace=false;
 }
 // All touching fragments form one line-breaking unit (e.g. "$x$-axis,").
 // A paragraph containing only a formula gets display placement automatically.
 let paragraph=[];
 function paragraphOut(){
  const visible=paragraph.filter(t=>t.box);
  if(visible.length===1&&visible[0].kind==='math'){block(visible[0].box);paragraph=[];return;}
  let unit=[];const flush=()=>{if(unit.length){put(join(unit));unit=[];}};
  for(const t of paragraph){
   if(t.kind==='display'){flush();block(t.box);}
   else if(t.kind==='space'){flush();pendingSpace=true;}
   else if(t.kind==='break'){flush();lineOut();pendingSpace=false;}
   else unit.push(t.box);
  }
  flush();lineOut();paragraph=[];
 }
 for(const t of tokens){if(t.kind==='paragraph'){paragraphOut();y=Math.max(y,bottom+EM*.8);pendingSpace=false;}else paragraph.push(t);}
 paragraphOut();
 if(problem.figure){y=Math.max(y,bottom+EM*.8);block(image(problem.figure));}
 const options=problem.options??{},figures=problem.optionFigures??{};
 if(typeof options!=='object'||typeof figures!=='object'||Array.isArray(options)||Array.isArray(figures))throw new TypeError('Invalid choices');
 const keys=[...new Set([...Object.keys(options),...Object.keys(figures)])].sort();
 if(keys.length>64)throw new VlxError('LIMIT','Too many choices');
 if(keys.length){
  const pictured=keys.some(key=>Object.hasOwn(figures,key));
  const choices=keys.map(key=>{
   if(!/^[A-Za-z0-9]{1,8}$/.test(key))throw new TypeError('Invalid choice label');
   const label=literal('('+key+')');
   if(Object.hasOwn(figures,key)){
    const figure=figures[key],b=image(figure);if(figure.includesChoiceLabel===true)return b;
    const labelH=EM*.9,gap=EM*.3,w=Math.max(label.w,b.w),height=labelH+gap+b.h;
    return box(w,height,0,move(label,0,-height+labelH-label.d)+move(b,0), '');
   }
   if(typeof options[key]!=='string')throw new TypeError('Choice TeX must be a string');
   inputBytes+=options[key].length;if(inputBytes>131072)throw new VlxError('LIMIT','Problem text exceeds the length budget');
   return fit(join([label,box(EM*.3,0,0,'',''),math(options[key])]));
  });
  const gap=EM*(pictured?.8:1.6),cell=Math.max(...choices.map(b=>b.w)),columns=Math.max(1,Math.min(keys.length,Math.floor((CONTENT+gap)/(cell+gap))));
  y=Math.max(y,bottom+EM*.8);
  for(let start=0;start<choices.length;start+=columns){
   const row=choices.slice(start,start+columns),h=Math.max(...row.map(b=>b.h)),d=Math.max(...row.map(b=>b.d));
   row.forEach((b,c)=>output.push(move(b,PAD+c*(cell+gap),y+h)));
   bottom=y+h+d;y=bottom+EM*.8;check();
  }
 }
 const height=Math.ceil(Math.max(PAD,bottom)+PAD);if(WIDTH*height>PIXELS)throw new VlxError('LIMIT','Problem page exceeds the pixel budget');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}"><title>Mathematics problem</title><rect width="100%" height="100%" fill="white"/><g color="black">${output.join('')}</g></svg>`;
 if(svg.length>32*1024*1024)throw new VlxError('LIMIT','Problem SVG exceeds the output budget');
 return {svg,width:WIDTH,height};
}
function renderProblemPng(problem){
 const {svg}=renderProblemSvg(problem),{Resvg}=require('@resvg/resvg-js');
 return Buffer.from(new Resvg(svg,{font:{loadSystemFonts:false}}).render().asPng());
}
exports.renderProblemSvg=renderProblemSvg;
exports.renderProblemPng=renderProblemPng;
exports.pngSize=pngSize;
exports.segments=segments;
exports.typography=typography;

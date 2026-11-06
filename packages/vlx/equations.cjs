'use strict';
const {parse,VlxError}=require('./source.cjs');
const {parseMath}=require('./tex.cjs');
const empty=()=>({kind:'row',children:[]});
const environment=name=>/^(equation|align|gather)\*?$/.test(name);
const error=(code,message,start)=>new VlxError(code,message,{start});
function key(value){if(!/^[A-Za-z0-9_][A-Za-z0-9_:./-]{0,127}$/.test(value))throw error('LABEL','Labels must contain 1–128 ASCII letters, digits, _, :, ., / or -');return value;}
function options(settings={}){
 const numbering=settings.numbering??'ams',startNumber=settings.startNumber??1,idPrefix=settings.idPrefix??'vlx';
 if(!['ams','all','none'].includes(numbering))throw new TypeError('numbering must be ams, all or none');
 if(!Number.isSafeInteger(startNumber)||startNumber<1||startNumber>1000000)throw new RangeError('startNumber must be an integer from 1 to 1000000');
 if(typeof idPrefix!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,127}$/.test(idPrefix))throw new TypeError('idPrefix must be 1–128 ASCII letters, digits, _ or -, starting with a letter');
 const errorMode=settings.errorMode??'throw';if(!['throw','source'].includes(errorMode))throw new TypeError('errorMode must be throw or source');
 return {numbering,startNumber,idPrefix,errorMode};
}
function textOf(node){
 if(node.kind==='text'||node.kind==='number'||node.kind==='symbol')return node.text;
 if(node.kind==='row'||node.kind==='textrow')return node.children.map(textOf).join('');
 if(['font','style','color','class','boldsymbol'].includes(node.kind))return textOf(node.body);
 if(node.kind==='space')return ' ';
 if(node.kind==='scripts')return textOf(node.base)+(node.sub?'_'+textOf(node.sub):'')+(node.sup?'^'+textOf(node.sup):'');
 throw error('TAG','Referenceable custom tags support text, symbols, font styles and scripts');
}
function compile(source,settings={}){
 const config=options(settings),document=parse(source,{equations:true}),labels=new Map(),equations=[],references=[],diagnostics=[...document.diagnostics];
 if(diagnostics.length&&config.errorMode==='throw')throw error(diagnostics[0].code,diagnostics[0].message,diagnostics[0].start);
 let counter=config.startNumber;
 if(document.nodes.filter(n=>n.kind!=='text').length>4096)throw error('LIMIT','At most 4096 math expressions and references per document');
 const nodes=document.nodes.map(node=>({...node}));
 function report(node,err){if(config.errorMode==='throw'||!(err instanceof VlxError))throw err;node.error=err;diagnostics.push({code:err.code,message:err.message,start:node.start,end:node.end});}
 function collect(ast,meta){
  if(ast.kind==='label'){meta.labels.push(key(ast.label));return null;}
  if(ast.kind==='suppress'){meta.suppress=true;return null;}
  if(ast.kind==='tag'){if(meta.tag)throw error('TAG','Duplicate equation tag');meta.tag=ast;return null;}
  if(ast.kind==='table'&&environment(ast.name))throw error('EQUATION_CONTEXT','Numbered environments must be top-level display math');
  for(const [name,value]of Object.entries(ast)){
   if(Array.isArray(value))ast[name]=value.map(part=>Array.isArray(part)?part.map(cell=>collect(cell,meta)||empty()):part?.kind?collect(part,meta):part).filter(part=>part!==null);
   else if(value?.kind)ast[name]=collect(value,meta)||empty();
  }
  return ast;
 }
 function definition(meta,automatic,node,row){
  if(meta.suppress&&meta.tag)throw error('TAG','An equation cannot have both a tag and notag/nonumber');
  if(!node.display&&(meta.labels.length||meta.tag||meta.suppress))throw error('EQUATION_CONTEXT','Equation definitions require display math');
  let tag=meta.tag,number=null;
  if(!tag&&automatic&&!meta.suppress){if(counter>1000000)throw error('LIMIT','Equation counter exceeds 1000000');number=counter++;tag={kind:'tag',body:{kind:'text',text:String(number)}};}
  if(!tag){if(meta.labels.length)throw error('UNNUMBERED_LABEL','A label requires a numbered equation or explicit tag');return null;}
  const text=textOf(tag.body);if(!text||text.length>128)throw error('TAG','Custom tags must contain 1–128 visible characters');
  if(meta.labels.length>32)throw error('LIMIT','At most 32 labels per equation');
  const local=new Set();for(const label of meta.labels){if(local.has(label)||labels.has(label))throw error('DUPLICATE_LABEL','Duplicate equation label: '+label,node.start);local.add(label);}
  if(equations.length>=1024)throw error('LIMIT','At most 1024 equations per document');
  // Label-based IDs survive renumbering and reordering. Unlabelled IDs use the
  // document's source order; no user text becomes executable markup or a URL.
  const suffix=meta.labels.length?'label-'+Array.from(meta.labels[0],c=>c.charCodeAt(0).toString(16)).join('-'):'number-'+(equations.length+1);
  const eq={id:config.idPrefix+'-'+suffix,number,tag:text,displayTag:tag.star?text:'('+text+')',labels:meta.labels.slice(),start:node.start,end:node.end,row};
  const record={...eq,body:tag.body,star:!!tag.star};equations.push(eq);node.equations.push(eq);
  for(const label of meta.labels)labels.set(label,record);
  return {body:tag.body,star:!!tag.star};
 }
 for(const node of nodes){
  if(node.kind!=='math')continue;node.equations=[];const checkpoint=equations.length,previousCounter=counter;
  try{
   const ast=parseMath(node.tex,{equations:true});
   const table=ast.kind==='row'&&ast.children.length===1&&ast.children[0].kind==='table'&&environment(ast.children[0].name)?ast.children[0]:null;
   if(table){
    if(!node.display)throw error('EQUATION_CONTEXT','Equation environments require display math');
    if(table.name.startsWith('equation')&&(table.rows.length!==1||table.rows[0].length!==1))throw error('EQUATION_CONTEXT','Use align or gather for multiple equation rows');
    if(table.name.startsWith('gather')&&table.rows.some(row=>row.length!==1))throw error('EQUATION_CONTEXT','gather rows cannot have alignment cells');
    const automatic=!table.name.endsWith('*')&&config.numbering!=='none';
    table.rowTags=table.rows.map((cells,row)=>{const meta={labels:[]};table.rows[row]=cells.map(cell=>collect(cell,meta)||empty());return definition(meta,automatic,node,row);});
   }else{
    const meta={labels:[]},body=collect(ast,meta)||empty(),tag=definition(meta,node.display&&config.numbering==='all',node,0);
    node.ast=tag?{kind:'numbered',body,tag}:body;
   }
   node.ast??=ast;
  }catch(err){
   for(const eq of equations.splice(checkpoint))for(const label of eq.labels)labels.delete(label);
   counter=previousCounter;node.equations=[];report(node,err);
  }
 }
 // Resolve only after every successful definition has been collected. No mutable
 // label map or partially built result is retained across calls or React renders.
 function resolve(ast,node){
  if(ast.kind==='reference'){
   const label=key(ast.label),target=labels.get(label);if(!target)throw error('UNDEFINED_REFERENCE','Unknown equation label: '+label,node.start);
   if(references.length>=4096)throw error('LIMIT','At most 4096 references per document');
   references.push({label,id:target.id,tag:target.tag,display:ast.parentheses?'('+target.tag+')':target.tag,start:node.start,end:node.end});
   return {kind:'resolved-reference',body:target.body,parentheses:ast.parentheses,id:target.id,text:target.tag};
  }
  for(const [name,value]of Object.entries(ast)){
   if(Array.isArray(value))ast[name]=value.map(part=>Array.isArray(part)?part.map(cell=>resolve(cell,node)):part?.kind?resolve(part,node):part);
   else if(value?.kind)ast[name]=resolve(value,node);
  }
  return ast;
 }
 for(const node of nodes){
  if(node.error||node.kind==='text')continue;const count=references.length;
  try{node.ast=resolve(node.kind==='reference'?{kind:'reference',label:node.label,parentheses:node.parentheses}:node.ast,node);node.references=references.slice(count);node.ast.hasReferences=node.references.length>0;}
  catch(err){references.length=count;report(node,err);}
 }
 return {source,nodes,equations,references,diagnostics,nextNumber:counter,config};
}
function fallbackTree(node,{element:E,text:T}){
 const source=E('span',{'data-vlx-error':node.error.code},T(node.raw));
 return wrapTargets(source,node.equations||[],{element:E,text:T});
}
function wrapTargets(tree,equations,{element:E,text:T}){
 if(!equations.length)return tree;
 const targets=equations.map(eq=>E('span',{id:eq.id,tabIndex:-1,className:'vlx-equation-target',role:'group','aria-label':'Equation '+eq.displayTag},T('\u200b')));
 return E('span',{className:'vlx-equation',style:{position:'relative',display:'block'}},targets,tree);
}
function renderDocument(source,settings,render,emitter){
 const result=compile(source,settings),{text:T}=emitter;let bytes=0;
 for(const node of result.nodes){
  if(node.kind==='text'){node.html=T(node.value);continue;}
  if(!node.error)try{
   const output=render(node.tex??node.raw,{display:!!node.display,fontSize:settings?.fontSize},node.ast);
   node.html=wrapTargets(output.html,node.equations||[],emitter);
  }catch(err){if(result.config.errorMode==='throw'||!(err instanceof VlxError))throw err;node.error=err;result.diagnostics.push({code:err.code,message:err.message,start:node.start,end:node.end});}
  if(node.error)node.html=fallbackTree(node,emitter);
  bytes+=typeof node.html==='string'?node.html.length*2:emitter.weight(node.html);
  if(bytes>16777216)throw error('LIMIT','Document output exceeds 16 MiB');
  delete node.ast;
 }
 const html=emitter.join?result.nodes.map(n=>n.html).join(''):result.nodes.map(n=>n.html);
 result.diagnostics.sort((a,b)=>a.start-b.start);
 const {config,...publicResult}=result;return {...publicResult,html};
}
exports.compile=compile;exports.renderDocument=renderDocument;exports.key=key;

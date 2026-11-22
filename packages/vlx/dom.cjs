'use strict';
// Optional browser lifecycle. Mark only overflowing formulas as keyboard scroll
// targets; static MathML remains accessible without this helper or JavaScript.
const selector='[data-vlx="math"]';
const {selectedTex}=require('./selection-tex.cjs');
function installMathStyles(document) {
 if(!document?.createElement||!document.querySelector)throw new TypeError('installMathStyles needs a document');
 if(document.querySelector('style[data-vlx-styles]'))return;
 const style=document.createElement('style');style.setAttribute('data-vlx-styles','');
 style.textContent=require('./styles.cjs');
 (document.head||document.documentElement).appendChild(style);
}
function observeMath(root,options={}) {
 const view=root?.ownerDocument?.defaultView;
 if(!root?.querySelectorAll||!view?.getComputedStyle)throw new TypeError('observeMath needs a browser element or document fragment');
 const label=options.scrollLabel??'Scrollable mathematical expression';
 if(typeof label!=='string'||!label.trim())throw new TypeError('scrollLabel must be a nonempty string');
 installMathStyles(root.ownerDocument);
 const records=new Map();let stopped=false;
 function restore(element,record){
  for(const [name,value] of record.owned)if(element.getAttribute(name)===value)element.removeAttribute(name);
  record.owned.clear();
 }
 function update(element,record){
  const width=element.clientWidth;
  if(width<=0||element.scrollWidth<=width+1){restore(element,record);return;}
  const style=view.getComputedStyle(element),svg=element.querySelector('svg'),scale=element.offsetWidth?element.getBoundingClientRect().width/element.offsetWidth:1;
  const available=width-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0);
  const visibleOverflow=!svg||svg.getBoundingClientRect().width>available*scale+1;
  const overflow=/^(auto|scroll)$/.test(style.overflowX)&&visibleOverflow;
  if(!overflow){restore(element,record);return;}
  for(const [name,value] of [['tabindex','0'],['role','group'],['aria-label',label]])if(!element.hasAttribute(name)){element.setAttribute(name,value);record.owned.set(name,value);}
 }
 const resize=typeof view.ResizeObserver==='function'?new view.ResizeObserver(entries=>{if(!stopped)for(const {target}of entries){const record=records.get(target);if(record)update(target,record);}}):null;
 function scan(){
  if(stopped)return;
  const found=new Set(root.querySelectorAll(selector));if(root.matches?.(selector))found.add(root);
  for(const [element,record]of records)if(!found.has(element)){resize?.unobserve(element);restore(element,record);records.delete(element);}
  for(const element of found){let record=records.get(element);if(!record){record={owned:new Map()};records.set(element,record);resize?.observe(element);}update(element,record);}
 }
 function copy(event){
  if(event.defaultPrevented||!event.clipboardData)return;
  const selection=root.ownerDocument.getSelection();if(!selection||selection.isCollapsed||selection.rangeCount!==1)return;
  const range=selection.getRangeAt(0);try{if(!range.intersectsNode(root))return;}catch{return;}
  const document=root.ownerDocument,boundary=document.createRange();
  let handled=false;
  function selectedText(node){
   boundary.selectNodeContents(node);
   let start=0,end=node.length;
   if(range.compareBoundaryPoints(view.Range.START_TO_START,boundary)>0){
    if(range.startContainer!==node)return '';start=range.startOffset;
   }
   if(range.compareBoundaryPoints(view.Range.END_TO_END,boundary)<0){
    if(range.endContainer!==node)return '';end=range.endOffset;
   }
   return node.nodeValue.slice(start,end);
  }
  function covers(element){
   const text=[...element.querySelectorAll('.vlx-select')].flatMap(e=>[...e.childNodes]).filter(n=>n.nodeType===3);
   if(text.length){
    boundary.setStart(text[0],0);boundary.setEnd(text.at(-1),text.at(-1).length);
   }else boundary.selectNode(element);
   return range.compareBoundaryPoints(view.Range.START_TO_START,boundary)<=0&&range.compareBoundaryPoints(view.Range.END_TO_END,boundary)>=0;
  }
  function plain(node){
   if(!range.intersectsNode(node))return '';
   if(node.nodeType===3)return selectedText(node);
   if(node.nodeType!==1&&node.nodeType!==11)return '';
   if(node.matches?.(selector)){
    const tex=covers(node)?node.querySelector('annotation[encoding="application/x-tex"]')?.textContent:selectedTex(node.querySelector('svg'),range,selectedText);
    if(tex){handled=true;return node.getAttribute('data-vlx-display')==='true'?'\\['+tex+'\\]':'$'+tex+'$';}
   }
   if(node.localName==='math'||['SCRIPT','STYLE'].includes(node.nodeName))return '';
   if(node.nodeName==='BR')return '\n';
   if(node.nodeName==='IMG')return node.getAttribute('alt')||'';
   if(node.matches?.('.vlx-select')){const value=[...node.childNodes].map(plain).join('');if(value)handled=true;return value;}
   const content=[...node.childNodes].map(plain).join('');
   return /^(P|DIV|SECTION|LI|H[1-6])$/.test(node.nodeName)?content+'\n':content;
  }
  let ancestor=range.commonAncestorContainer;
  const parent=ancestor.nodeType===1?ancestor:ancestor.parentElement;
  ancestor=parent?.closest(selector)||ancestor;
  const value=plain(ancestor).replace(/\n+$/,'');
  if(handled){event.clipboardData.setData('text/plain',value);event.preventDefault();}
 }

 root.ownerDocument.addEventListener('copy',copy);
 const mutation=typeof view.MutationObserver==='function'?new view.MutationObserver(scan):null;
 mutation?.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
 view.addEventListener('resize',scan);view.addEventListener('beforeprint',scan);scan();
 return function disconnect(){if(stopped)return;stopped=true;root.ownerDocument.removeEventListener('copy',copy);view.removeEventListener('resize',scan);view.removeEventListener('beforeprint',scan);mutation?.disconnect();resize?.disconnect();for(const [element,record]of records)restore(element,record);records.clear();};
}
exports.observeMath=observeMath;
exports.installMathStyles=installMathStyles;

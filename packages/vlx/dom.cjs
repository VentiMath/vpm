'use strict';
// Optional browser lifecycle. Mark only overflowing formulas as keyboard scroll
// targets; static MathML remains accessible without this helper or JavaScript.
const selector='[data-vlx="math"]';
function observeMath(root,options={}) {
 const view=root?.ownerDocument?.defaultView;
 if(!root?.querySelectorAll||!view?.getComputedStyle)throw new TypeError('observeMath needs a browser element or document fragment');
 const label=options.scrollLabel??'Scrollable mathematical expression';
 if(typeof label!=='string'||!label.trim())throw new TypeError('scrollLabel must be a nonempty string');
 const records=new Map();let stopped=false;
 function restore(element,record){
  for(const [name,value] of record.owned)if(element.getAttribute(name)===value)element.removeAttribute(name);
  record.owned.clear();
 }
 function update(element,record){
  const style=view.getComputedStyle(element),svg=element.querySelector('svg'),scale=element.offsetWidth?element.getBoundingClientRect().width/element.offsetWidth:1;
  const available=element.clientWidth-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0);
  const visibleOverflow=!svg||svg.getBoundingClientRect().width>available*scale+1;
  const overflow=/^(auto|scroll)$/.test(style.overflowX)&&element.clientWidth>0&&element.scrollWidth>element.clientWidth+1&&visibleOverflow;
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
  const fragment=range.cloneContents(),formulas=[...fragment.querySelectorAll(selector)];
  // Whole mathematical widgets in a mixed prose selection become their authored
  // source. Other selections, including partial MathML selections, keep native
  // behavior. No system clipboard access occurs outside an actual copy event.
  if(!formulas.length)return;
  let changed=false;
  for(const element of formulas){const tex=element.querySelector('annotation[encoding="application/x-tex"]')?.textContent;if(tex===undefined)continue;const display=element.getAttribute('data-vlx-display')==='true';element.replaceWith(root.ownerDocument.createTextNode(display?'\\['+tex+'\\]':'$'+tex+'$'));changed=true;}
  if(!changed)return;
  function plain(node){
   if(node.nodeType===3)return node.nodeValue;
   if(node.nodeType!==1&&node.nodeType!==11)return '';
   if(node.nodeName==='BR')return '\n';if(node.nodeName==='IMG')return node.getAttribute('alt')||'';
   if(['SCRIPT','STYLE'].includes(node.nodeName))return '';
   const content=[...node.childNodes].map(plain).join('');return /^(P|DIV|SECTION|LI|H[1-6])$/.test(node.nodeName)?content+'\n':content;
  }
  event.clipboardData.setData('text/plain',plain(fragment).replace(/\n+$/,''));event.preventDefault();
 }
 root.ownerDocument.addEventListener('copy',copy);
 const mutation=typeof view.MutationObserver==='function'?new view.MutationObserver(scan):null;
 mutation?.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
 view.addEventListener('resize',scan);view.addEventListener('beforeprint',scan);scan();
 return function disconnect(){if(stopped)return;stopped=true;root.ownerDocument.removeEventListener('copy',copy);view.removeEventListener('resize',scan);view.removeEventListener('beforeprint',scan);mutation?.disconnect();resize?.disconnect();for(const [element,record]of records)restore(element,record);records.clear();};
}
exports.observeMath=observeMath;
